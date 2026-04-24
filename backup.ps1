$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $root "backup.log"
$remoteName = "origin"
$branchName = "main"
$gitBaseArgs = @("-C", $root, "-c", "safe.directory=$root")
$maxFileSizeBytes = 99MB

function Write-Log {
    param([string]$Message)

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    $line | Tee-Object -FilePath $logFile -Append
}

function Invoke-Checked {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

function Invoke-GitPushWithRetry {
    param(
        [int]$MaxAttempts = 3,
        [int]$DelaySeconds = 10
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Write-Log ("Push attempt {0}/{1} started." -f $attempt, $MaxAttempts)
        $pushOutput = & git @gitBaseArgs push -u $remoteName $branchName 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($pushOutput) {
                Write-Log ("Push output: {0}" -f (($pushOutput | Out-String).Trim()))
            }
            Write-Log ("Push attempt {0}/{1} succeeded." -f $attempt, $MaxAttempts)
            return
        }

        if ($pushOutput) {
            Write-Log ("Push output: {0}" -f (($pushOutput | Out-String).Trim()))
        }

        if ($attempt -ge $MaxAttempts) {
            throw ("git push failed after {0} attempts. Last exit code: {1}." -f $MaxAttempts, $LASTEXITCODE)
        }

        Write-Log ("Push attempt {0}/{1} failed. Retrying in {2} seconds." -f $attempt, $MaxAttempts, $DelaySeconds)
        Start-Sleep -Seconds $DelaySeconds
    }
}

function Get-RelativeGitPath {
    param([string]$FullPath)

    $resolvedRoot = [System.IO.Path]::GetFullPath($root)
    $resolvedPath = [System.IO.Path]::GetFullPath($FullPath)
    $rootUri = New-Object System.Uri(($resolvedRoot.TrimEnd('\') + '\'))
    $pathUri = New-Object System.Uri($resolvedPath)
    $relativePath = [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString())
    return ($relativePath -replace "\\", "/")
}

function Remove-OversizedFilesFromIndex {
    $oversizedFiles = Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        Where-Object {
            $_.FullName -notlike "*\.git\*" -and
            $_.Length -gt $maxFileSizeBytes
        } |
        Sort-Object FullName -Unique

    if (-not $oversizedFiles) {
        return @()
    }

    $skippedGitPaths = @()
    foreach ($file in $oversizedFiles) {
        $gitPath = Get-RelativeGitPath -FullPath $file.FullName
        $skippedGitPaths += $gitPath
        Write-Log ("Skipping oversized file: {0} ({1} bytes)" -f $gitPath, $file.Length)
        & git @gitBaseArgs rm --cached --ignore-unmatch --quiet -- $gitPath
        if ($LASTEXITCODE -ne 0) {
            throw ("git rm --cached failed for oversized file '{0}' with exit code {1}." -f $gitPath, $LASTEXITCODE)
        }
    }

    return $skippedGitPaths
}

try {
    Write-Log "Backup run started."

    Invoke-Checked "git add" { & git @gitBaseArgs add -A -- . }
    $skippedOversizedPaths = Remove-OversizedFilesFromIndex

    $trackedStatusLines = @(& git @gitBaseArgs status --porcelain --untracked-files=no)
    $untrackedPaths = @(& git @gitBaseArgs ls-files --others --exclude-standard)
    $filteredUntrackedPaths = if ($skippedOversizedPaths.Count -gt 0) {
        $untrackedPaths | Where-Object { $skippedOversizedPaths -notcontains $_ }
    }
    else {
        $untrackedPaths
    }

    $statusLines = @($trackedStatusLines) + @($filteredUntrackedPaths)
    $status = if ($statusLines.Count -eq 0) { "" } else { ($statusLines | Out-String).Trim() }
    if (-not $status) {
        Write-Log "No content change detected. Skipping commit."
        exit 0
    }

    $message = "backup: update repo snapshot {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Invoke-Checked "git commit" { & git @gitBaseArgs commit -m $message }
    Write-Log "Commit created: $message"

    Invoke-GitPushWithRetry
    Write-Log "Push completed."
}
catch {
    Write-Log ("Backup failed: {0}" -f $_.Exception.Message)
    exit 1
}
