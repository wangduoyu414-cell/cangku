[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$SkipBuildTools,
    [switch]$SkipWsl,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$IsWindowsPlatform = $env:OS -eq 'Windows_NT'

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-WarnLine {
    param([string]$Message)
    Write-Warning $Message
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$IgnoreExitCode
    )

    $display = if ($Arguments.Count -gt 0) {
        "$FilePath " + ($Arguments -join ' ')
    }
    else {
        $FilePath
    }

    if ($DryRun) {
        Write-Info "DRY-RUN: $display"
        return
    }

    & $FilePath @Arguments
    if (-not $IgnoreExitCode -and $LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $display"
    }
}

function Resolve-WinGet {
    $command = Get-Command winget -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe'),
        (Join-Path $env:ProgramFiles 'WindowsApps\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\winget.exe')
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return $candidate
        }
    }

    try {
        Add-AppxPackage -RegisterByFamilyName -MainPackage 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe' -ErrorAction Stop
    }
    catch {
        Write-WarnLine "Unable to self-repair App Installer registration. Install Microsoft App Installer manually if winGet is unavailable."
    }

    $command = Get-Command winget -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $windowsApps = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe'
    if (Test-Path -LiteralPath $windowsApps) {
        return $windowsApps
    }

    Write-Step 'Bootstrapping winGet from the official PowerShell repair path.'
    if ($DryRun) {
        Write-Info 'DRY-RUN: Install-PackageProvider NuGet; Install-Module Microsoft.WinGet.Client; Repair-WinGetPackageManager -AllUsers'
        return 'winget'
    }
    else {
        try {
            Install-PackageProvider -Name NuGet -Force | Out-Null
        }
        catch {
            Write-WarnLine 'Failed to install the NuGet package provider required for Microsoft.WinGet.Client.'
        }

        try {
            Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
            Install-Module -Name Microsoft.WinGet.Client -Force -Repository PSGallery -Scope AllUsers -AllowClobber | Out-Null
            Import-Module Microsoft.WinGet.Client -Force

            if (Get-Command Repair-WinGetPackageManager -ErrorAction SilentlyContinue) {
                Repair-WinGetPackageManager -AllUsers
            }
        }
        catch {
            Write-WarnLine 'The official PowerShell winGet repair path did not complete successfully.'
        }
    }

    $command = Get-Command winget -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    if (Test-Path -LiteralPath $windowsApps) {
        return $windowsApps
    }

    throw 'winGet is not available. Install Microsoft App Installer first, then rerun this script.'
}

function Install-WinGetPackage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WinGetPath,
        [Parameter(Mandatory = $true)]
        [string]$PackageId,
        [string]$Override
    )

    $args = @(
        'install',
        '--id', $PackageId,
        '--exact',
        '--silent',
        '--disable-interactivity',
        '--accept-package-agreements',
        '--accept-source-agreements'
    )

    if ($Override) {
        $args += @('--override', $Override)
    }

    Invoke-External -FilePath $WinGetPath -Arguments $args
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($machinePath, $userPath) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    if ($parts.Count -gt 0) {
        $env:Path = ($parts -join ';')
    }
}

function Get-VersionText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName,
        [string[]]$Arguments = @('--version')
    )

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $command) {
        return $null
    }

    $output = & $command.Source @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }

    return ($output | Out-String).Trim()
}

function Get-NodeMajorVersion {
    $versionText = Get-VersionText -CommandName 'node'
    if (-not $versionText) {
        return $null
    }

    if ($versionText -match 'v?(?<major>\d+)\.') {
        return [int]$Matches.major
    }

    return $null
}

function Get-PythonVersion {
    $pythonText = Get-VersionText -CommandName 'python' -Arguments @('--version')
    if ($pythonText -and $pythonText -match 'Python (?<major>\d+)\.(?<minor>\d+)') {
        return [version]::new([int]$Matches.major, [int]$Matches.minor)
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        $pyText = & $py.Source -3 --version 2>$null
        if ($LASTEXITCODE -eq 0 -and $pyText -match 'Python (?<major>\d+)\.(?<minor>\d+)') {
            return [version]::new([int]$Matches.major, [int]$Matches.minor)
        }
    }

    return $null
}

function Test-WindowsTerminalPresent {
    if (Get-Command wt -ErrorAction SilentlyContinue) {
        return $true
    }

    try {
        $package = Get-AppxPackage -Name Microsoft.WindowsTerminal -ErrorAction Stop
        return [bool]$package
    }
    catch {
        return $false
    }
}

function Test-DockerDesktopPresent {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        return $true
    }

    $paths = @(
        (Join-Path ${env:ProgramFiles} 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe')
    )

    foreach ($path in $paths) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            return $true
        }
    }

    return $false
}

function Test-VcBuildToolsPresent {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) {
        return $false
    }

    $result = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    return [bool](($result | Out-String).Trim())
}

function Ensure-RegistryDword {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [int]$Value
    )

    $current = $null
    try {
        $current = (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
    }
    catch {
        $current = $null
    }

    if ($current -eq $Value) {
        Write-Info "$Name is already set to $Value."
        return
    }

    if ($DryRun) {
        Write-Info "DRY-RUN: Set-ItemProperty -Path '$Path' -Name '$Name' -Value $Value"
        return
    }

    New-Item -Path $Path -Force | Out-Null
    New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType DWord -Force | Out-Null
    Write-Info "Set $Name to $Value."
}

function Ensure-GitConfiguration {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-WarnLine 'Git is not available yet. Skipping Git configuration.'
        return
    }

    Invoke-External -FilePath $git.Source -Arguments @('config', '--global', 'core.longpaths', 'true')
    Invoke-External -FilePath $git.Source -Arguments @('config', '--global', 'core.safecrlf', 'warn')
}

function Ensure-Wsl {
    if ($SkipWsl) {
        Write-Info 'Skipping WSL setup.'
        return
    }

    $wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if (-not $wsl) {
        throw 'wsl.exe was not found on this Windows installation.'
    }

    $featureNames = @(
        'Microsoft-Windows-Subsystem-Linux',
        'VirtualMachinePlatform'
    )

    $needsInstall = $false
    foreach ($featureName in $featureNames) {
        try {
            $feature = Get-WindowsOptionalFeature -Online -FeatureName $featureName -ErrorAction Stop
            if ($feature.State -ne 'Enabled') {
                $needsInstall = $true
            }
        }
        catch {
            $needsInstall = $true
        }
    }

    $distros = @()
    try {
        $distros = & $wsl.Source -l -q 2>$null
    }
    catch {
        $distros = @()
    }

    if ($needsInstall -or -not (($distros | Out-String).Trim())) {
        Write-Step 'Installing WSL 2 and Ubuntu.'
        Invoke-External -FilePath $wsl.Source -Arguments @('--install', '-d', 'Ubuntu')
        Write-WarnLine 'WSL installation may require a reboot before Ubuntu finishes provisioning.'
    }

    Write-Step 'Ensuring WSL default version is 2.'
    Invoke-External -FilePath $wsl.Source -Arguments @('--set-default-version', '2') -IgnoreExitCode
}

function Ensure-RequiredPackage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [bool]$Installed,
        [Parameter(Mandatory = $true)]
        [scriptblock]$InstallAction
    )

    if ($Installed) {
        Write-Info "$Name is already installed."
        return
    }

    Write-Step "Installing $Name."
    & $InstallAction
}

if (-not $IsWindowsPlatform) {
    throw 'This script only supports Windows.'
}

if (-not $DryRun -and -not (Test-IsAdministrator)) {
    throw 'Run this script from an elevated PowerShell session. Administrator rights are required for WSL, long-path, and package installation changes.'
}

Write-Step 'Resolving winGet.'
$winGetPath = Resolve-WinGet
Write-Info "Using winGet at $winGetPath"

Write-Step 'Checking core packages.'

Ensure-RequiredPackage -Name 'PowerShell 7' -Installed ([bool](Get-Command pwsh -ErrorAction SilentlyContinue)) -InstallAction {
    Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'Microsoft.PowerShell'
}

Ensure-RequiredPackage -Name 'Windows Terminal' -Installed (Test-WindowsTerminalPresent) -InstallAction {
    Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'Microsoft.WindowsTerminal'
}

Ensure-RequiredPackage -Name 'Git' -Installed ([bool](Get-Command git -ErrorAction SilentlyContinue)) -InstallAction {
    Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'Git.Git'
}

$nodeMajor = Get-NodeMajorVersion
$nodeInstalled = $false
if ($nodeMajor) {
    $nodeInstalled = ($nodeMajor -ge 20 -and $nodeMajor % 2 -eq 0)
}

Ensure-RequiredPackage -Name 'Node.js LTS' -Installed $nodeInstalled -InstallAction {
    Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'OpenJS.NodeJS.LTS'
}

$pythonVersion = Get-PythonVersion
$pythonInstalled = $false
if ($pythonVersion) {
    $pythonInstalled = $pythonVersion -ge ([version]::new(3, 12))
}

Ensure-RequiredPackage -Name 'Python 3.12+' -Installed $pythonInstalled -InstallAction {
    $pythonPackageCandidates = @(
        'Python.Python.3.13',
        'Python.Python.3.12'
    )

    foreach ($packageId in $pythonPackageCandidates) {
        try {
            Install-WinGetPackage -WinGetPath $winGetPath -PackageId $packageId
            return
        }
        catch {
            Write-WarnLine "Failed to install $packageId via winGet. Trying the next Python package candidate."
        }
    }

    throw 'Unable to install Python via winGet.'
}

if (-not $SkipBuildTools) {
    Ensure-RequiredPackage -Name 'Visual Studio Build Tools (VC++)' -Installed (Test-VcBuildToolsPresent) -InstallAction {
        Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'Microsoft.VisualStudio.2022.BuildTools' -Override '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    }
}
else {
    Write-Info 'Skipping Visual Studio Build Tools installation.'
}

if (-not $SkipDocker) {
    Ensure-RequiredPackage -Name 'Docker Desktop' -Installed (Test-DockerDesktopPresent) -InstallAction {
        Install-WinGetPackage -WinGetPath $winGetPath -PackageId 'Docker.DockerDesktop'
    }
}
else {
    Write-Info 'Skipping Docker Desktop installation.'
}

Write-Step 'Applying Windows settings.'
Ensure-RegistryDword -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1
Ensure-Wsl

Write-Step 'Applying Git settings.'
Refresh-ProcessPath
Ensure-GitConfiguration

Write-Info 'Windows development environment bootstrap completed.'
