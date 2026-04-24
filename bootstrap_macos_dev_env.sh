#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=0
SKIP_DOCKER=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    --skip-docker)
      SKIP_DOCKER=1
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

log_step() {
  printf '[STEP] %s\n' "$1"
}

log_info() {
  printf '[INFO] %s\n' "$1"
}

log_warn() {
  printf '[WARN] %s\n' "$1" >&2
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[INFO] DRY-RUN:'
    for part in "$@"; do
      printf ' %q' "$part"
    done
    printf '\n'
    return 0
  fi

  "$@"
}

require_macos() {
  local system_name
  system_name="$(uname -s)"
  if [[ "$system_name" != "Darwin" ]]; then
    echo "This script only supports macOS." >&2
    exit 1
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

node_major_version() {
  if ! command_exists node; then
    return 1
  fi

  local version_text
  version_text="$(node --version 2>/dev/null || true)"
  if [[ "$version_text" =~ ^v([0-9]+)\. ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

python_minor_version() {
  if ! command_exists python3; then
    return 1
  fi

  local version_text
  version_text="$(python3 --version 2>/dev/null || true)"
  if [[ "$version_text" =~ ^Python[[:space:]]+([0-9]+)\.([0-9]+) ]]; then
    printf '%s.%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    return 0
  fi

  return 1
}

version_ge() {
  local lhs_major lhs_minor rhs_major rhs_minor
  lhs_major="${1%%.*}"
  lhs_minor="${1#*.}"
  rhs_major="${2%%.*}"
  rhs_minor="${2#*.}"

  if (( lhs_major > rhs_major )); then
    return 0
  fi

  if (( lhs_major < rhs_major )); then
    return 1
  fi

  (( lhs_minor >= rhs_minor ))
}

ensure_sudo() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log_info 'DRY-RUN: sudo -v'
    return 0
  fi

  sudo -v
}

install_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    log_info 'Xcode Command Line Tools already installed.'
    return 0
  fi

  log_step 'Installing Xcode Command Line Tools.'
  ensure_sudo

  local marker="/tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress"
  local product=""

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log_info 'DRY-RUN: softwareupdate lookup for Command Line Tools'
    return 0
  fi

  touch "$marker"
  product="$(softwareupdate -l 2>/dev/null | awk -F'*' '/Command Line Tools/ {print $2}' | sed 's/^ *//' | tail -n1 || true)"

  if [[ -n "$product" ]]; then
    sudo softwareupdate -i "$product" --verbose
  else
    xcode-select --install || true
    log_warn 'Command Line Tools installer was triggered. If macOS opens a dialog, complete it and rerun the script.'
  fi

  rm -f "$marker"
}

brew_bin() {
  if command_exists brew; then
    command -v brew
    return 0
  fi

  if [[ -x /opt/homebrew/bin/brew ]]; then
    printf '%s\n' /opt/homebrew/bin/brew
    return 0
  fi

  if [[ -x /usr/local/bin/brew ]]; then
    printf '%s\n' /usr/local/bin/brew
    return 0
  fi

  return 1
}

ensure_homebrew() {
  local brew_path

  if brew_path="$(brew_bin)"; then
    log_info "Homebrew already installed at $brew_path."
    return 0
  fi

  log_step 'Installing Homebrew.'
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log_info 'DRY-RUN: install Homebrew from the official installer script'
    return 0
  fi

  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
}

load_homebrew_env() {
  local brew_path shellenv_line profile_file
  if ! brew_path="$(brew_bin)"; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log_info 'DRY-RUN: Homebrew shellenv setup skipped because Homebrew is not installed yet.'
      return 0
    fi

    log_warn 'Homebrew is still unavailable after installation.'
    return 1
  fi

  eval "$("$brew_path" shellenv)"

  profile_file="$HOME/.zprofile"
  shellenv_line="eval \"\$($brew_path shellenv)\""

  if [[ -f "$profile_file" ]] && grep -Fqx "$shellenv_line" "$profile_file"; then
    log_info 'Homebrew shell environment already registered in ~/.zprofile.'
    return 0
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log_info "DRY-RUN: append Homebrew shellenv to $profile_file"
    return 0
  fi

  printf '\n%s\n' "$shellenv_line" >>"$profile_file"
  log_info 'Added Homebrew shellenv to ~/.zprofile.'
}

brew_package_installed() {
  local formula
  formula="$1"
  brew list --formula "$formula" >/dev/null 2>&1
}

brew_cask_installed() {
  local cask_name
  cask_name="$1"
  brew list --cask "$cask_name" >/dev/null 2>&1
}

ensure_brew_formula() {
  local formula
  formula="$1"

  if brew_package_installed "$formula"; then
    log_info "$formula is already installed."
    return 0
  fi

  log_step "Installing $formula via Homebrew."
  run_cmd brew install "$formula"
}

ensure_or_upgrade_brew_formula() {
  local formula
  formula="$1"

  if brew_package_installed "$formula"; then
    log_info "$formula is already installed."
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log_info "DRY-RUN: brew upgrade $formula"
    else
      brew upgrade "$formula" >/dev/null 2>&1 || true
    fi
  else
    log_step "Installing $formula via Homebrew."
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log_info "DRY-RUN: brew install $formula"
    else
      brew install "$formula"
    fi
  fi

  if [[ "$formula" == node@* || "$formula" == python@* ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log_info "DRY-RUN: brew link --overwrite --force $formula"
    else
      brew link --overwrite --force "$formula" >/dev/null 2>&1 || true
    fi
  fi

  return 0
}

ensure_preferred_brew_formula() {
  local formula

  for formula in "$@"; do
    if ensure_or_upgrade_brew_formula "$formula"; then
      return 0
    fi

    log_warn "Failed to install $formula. Trying the next formula candidate."
  done

  return 1
}

ensure_brew_cask() {
  local cask_name
  cask_name="$1"

  if brew_cask_installed "$cask_name"; then
    log_info "$cask_name is already installed."
    return 0
  fi

  log_step "Installing $cask_name via Homebrew."
  run_cmd brew install --cask "$cask_name"
}

require_macos

log_step 'Checking Xcode Command Line Tools.'
install_command_line_tools

if [[ "$DRY_RUN" -eq 0 ]] && ! xcode-select -p >/dev/null 2>&1; then
  log_warn 'Xcode Command Line Tools are still not ready. Finish the installer and rerun the script.'
  exit 1
fi

log_step 'Checking Homebrew.'
ensure_homebrew
load_homebrew_env

log_step 'Checking Git.'
if command_exists git; then
  log_info 'Git is already available.'
else
  ensure_brew_formula git
fi

log_step 'Checking Node.js.'
node_major=''
if node_major="$(node_major_version 2>/dev/null)"; then
  if [[ "$node_major" -ge 20 ]] && (( node_major % 2 == 0 )); then
    log_info "Node.js major version $node_major is already suitable."
  else
    ensure_preferred_brew_formula node@24 node@22 node
  fi
else
  ensure_preferred_brew_formula node@24 node@22 node
fi

log_step 'Checking Python 3.'
python_version=''
if python_version="$(python_minor_version 2>/dev/null)"; then
  if version_ge "$python_version" '3.12'; then
    log_info "Python $python_version is already suitable."
  else
    ensure_preferred_brew_formula python@3.13 python@3.12 python
  fi
else
  ensure_preferred_brew_formula python@3.13 python@3.12 python
fi

if [[ "$SKIP_DOCKER" -eq 0 ]]; then
  log_step 'Checking Docker Desktop.'
  if [[ -d /Applications/Docker.app ]] || command_exists docker; then
    log_info 'Docker Desktop is already present.'
  else
    ensure_brew_cask docker-desktop
  fi
else
  log_info 'Skipping Docker Desktop installation.'
fi

if [[ "$(uname -m)" == "arm64" ]]; then
  log_warn 'Apple Silicon detected. Rosetta 2 is not installed automatically because it is only needed for some x86_64 tools.'
fi

log_warn 'macOS privacy permissions such as Files & Folders, Full Disk Access, Accessibility, and Automation cannot be granted silently by script. Grant them manually when your tools request access.'
log_info 'macOS development environment bootstrap completed.'
