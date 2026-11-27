#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
NovAir quick staging install

Usage: bash setup.sh [--ssh | --private] [--domain HOST] [--database-env FILE]
                     [--port PORT] [--reserve-port PORT] [--proxy-config FILE]

Run on Linux as the dedicated non-root NovAir user. The wizard asks for
the staging domain and private database credential file if omitted.
For --private, Git prompts for a username and read-only GitHub token.
Prepare Node.js, systemd user services, cgroup v2 and a dedicated MySQL 8.4
database first. See the README for host prerequisites and update steps.
EOF
}

fail() {
  printf 'NovAir setup: %s\n' "$1" >&2
  exit 1
}

repository='https://github.com/Cat-Ghost-Community/Novair-Team.git'
clone_auth=''
wizard_args=()
while (($#)); do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --ssh)
      [[ -z "$clone_auth" ]] || fail "Choose one clone authentication method."
      clone_auth=ssh
      repository='git@github.com:Cat-Ghost-Community/Novair-Team.git'
      shift
      ;;
    --private)
      [[ -z "$clone_auth" ]] || fail "Choose one clone authentication method."
      clone_auth=token
      shift
      ;;
    --domain|--database-env|--port|--reserve-port|--proxy-config)
      (($# >= 2)) && [[ -n "$2" && "$2" != --* ]] || fail "Provide a value for $1."
      wizard_args+=("$1" "$2")
      shift 2
      ;;
    *)
      fail "Unsupported argument: $1. See --help."
      ;;
  esac
done

[[ "$(uname -s)" == Linux ]] || fail "This launcher requires Linux."
((EUID != 0)) || fail "Run as the dedicated NovAir user, for example with sudo -H -u novair."
[[ "${HOME:-}" == /* ]] || fail "HOME must point to the NovAir user's home directory."

# sudo may omit the target user's systemd environment. Use that user's own bus.
if [[ -n "${SUDO_USER:-}" ]]; then
  cd -- "$HOME" || fail "Could not enter the NovAir user's home directory."
  unset XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
  runtime_dir="/run/user/$EUID"
  if [[ -O "$runtime_dir" && -S "$runtime_dir/bus" ]]; then
    export XDG_RUNTIME_DIR="$runtime_dir"
    export DBUS_SESSION_BUS_ADDRESS="unix:path=$runtime_dir/bus"
  fi
fi

config_home="${XDG_CONFIG_HOME:-"$HOME/.config"}"
[[ "$config_home" == /* ]] || fail "XDG_CONFIG_HOME must be an absolute path."

for item in "$config_home/novair" "$config_home/systemd/user/novair.service"; do
  [[ ! -e "$item" && ! -L "$item" ]] || fail "This user already has NovAir installation state. Use the README update procedure."
done
for command in git node npm; do
  command -v "$command" >/dev/null || fail "$command is required. See the README host preparation."
done
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); process.exit(Number(!(major >= 22 && major < 25 && (major !== 22 || minor >= 12))));' ||
  fail "Use a supported Node.js release (22.12–24.x)."

umask 077
releases="$HOME/.local/share/novair/releases"
mkdir -p -- "$releases"
[[ -d "$releases" && ! -L "$releases" && -O "$releases" ]] || fail "The release directory must be owned by the NovAir user."
checkout="$(mktemp -d -- "$releases/release.XXXXXXXX")"
printf 'NovAir checkout: %s\n' "$checkout"

launch_installer() {
  local git_options=()
  if [[ "$clone_auth" == token ]]; then git_options=(-c credential.helper=); fi
  if ! git "${git_options[@]}" clone --branch main --single-branch -- "$repository" "$checkout"; then
    fail "Clone failed. For a private repository, use --private or an authorized SSH deploy key."
  fi
  [[ -f "$checkout/scripts/install-server.mjs" ]] || fail "The checkout is missing the NovAir installer."
  exec node --experimental-strip-types "$checkout/scripts/install-server.mjs" "${wizard_args[@]}"
}

# bash -s reads the downloaded script on stdin. Reopen the terminal for Git
# and the wizard after Bash has read the whole launcher.
if [[ -t 1 ]] && ( : </dev/tty ) 2>/dev/null; then
  launch_installer </dev/tty
else
  launch_installer
fi
