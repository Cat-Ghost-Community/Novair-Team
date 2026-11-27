#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
NovAir quick staging install

Usage: bash setup.sh [--ssh] [--domain HOST] [--database-env FILE]
                     [--port PORT] [--reserve-port PORT] [--proxy-config FILE]

Run on Linux as the dedicated non-root NovAir user. The wizard asks for
the staging domain and private database credential file if omitted.
Prepare Node.js, systemd user services, cgroup v2 and a dedicated MySQL 8.4
database first. See the README for host prerequisites and update steps.
EOF
}

fail() {
  printf 'NovAir setup: %s\n' "$1" >&2
  exit 1
}

repository='https://github.com/Cat-Ghost-Community/Novair-Team.git'
wizard_args=()
while (($#)); do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --ssh)
      repository='git@github.com:Cat-Ghost-Community/Novair-Team.git'
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
((EUID != 0)) || fail "Run this script as the dedicated NovAir user without sudo."
[[ "${HOME:-}" == /* ]] || fail "HOME must point to the NovAir user's home directory."
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

if ! git clone --branch main --single-branch -- "$repository" "$checkout"; then
  fail "Clone failed. For a private repository, use an authorized SSH deploy key or HTTPS credentials."
fi
[[ -f "$checkout/scripts/install-server.mjs" ]] || fail "The checkout is missing the NovAir installer."
exec node --experimental-strip-types "$checkout/scripts/install-server.mjs" "${wizard_args[@]}"
