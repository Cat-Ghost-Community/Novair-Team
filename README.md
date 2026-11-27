# NovAir

## Quick install

Run one block in an interactive Bash terminal after [preparing the Linux server](#linux-server-installation-guide). Both commands download `setup.sh`, clone the project, and open the setup wizard to ask for the staging hostname and database credential file. They use `sudo -u novair` so the wizard runs under the dedicated NovAir account. Replace `novair` if you chose a different user.

### Public repo

Use this while [Novair-Team](https://github.com/Cat-Ghost-Community/Novair-Team) is public.

```bash
(
  setup_file="$(mktemp /tmp/novair-setup.XXXXXXXX)" || exit 1
  trap 'rm -f -- "$setup_file"' EXIT
  curl -fsSL https://raw.githubusercontent.com/Cat-Ghost-Community/Novair-Team/main/setup.sh \
    -o "$setup_file" && sudo -H -u novair bash -s < "$setup_file"
)
```

### Private repo

[Create a fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new) scoped to **Novair-Team**, with **Contents: Read-only**. The download uses the GitHub Contents API and reads the token from a hidden prompt.

```bash
(
  set +x
  unset github_token
  read -rsp "GitHub token: " github_token || exit 1
  printf '\n'
  setup_file="$(mktemp /tmp/novair-setup.XXXXXXXX)" || exit 1
  trap 'rm -f -- "$setup_file"' EXIT
  printf 'Authorization: Bearer %s\n' "$github_token" |
    curl -fsSL -H @- -H 'Accept: application/vnd.github.raw+json' \
      'https://api.github.com/repos/Cat-Ghost-Community/Novair-Team/contents/setup.sh?ref=main' \
      -o "$setup_file" &&
    unset github_token &&
    sudo -H -u novair bash -s -- --private < "$setup_file"
)
```

When Git asks for credentials for the private clone, enter your GitHub username and use the same token at the password prompt. If you prefer a deploy key, follow [SSH key setup](#ssh-key-setup).

## Linux server installation guide

### Prepare the server

1. Create a dedicated **non-root** Linux user, such as `novair`, with a private home directory. Keep its checkout outside any web document root.
2. Provide **Bash, curl, Git, npm**, and a supported Node.js version for that user. Use Node.js **22 LTS at or above 22.12** or **24 LTS**.
3. Enable the user’s **systemd** manager and lingering. The installer requires delegated **cgroup v2 CPU and memory controllers**, enforces a **2 GiB memory limit and one CPU core** during builds, and checks for at least **3 GiB of available memory**.
4. Use **MySQL 8.4** on loopback. Provision a new empty schema named `novair_<suffix>`. Create separate database accounts for runtime reads and writes and for migrations. Scope both accounts to that schema.
5. Choose a staging hostname and prepare HTTPS on your existing proxy. Rehearse the installation on a disposable Linux host before using a shared server.

### Prepare database credentials

Create a private file outside the checkout with mode `0600`, owned by the dedicated NovAir user. Substitute the actual account names and percent-encode their passwords.

```dotenv
DATABASE_URL=mysql://<runtime-user>:<encoded-password>@127.0.0.1:3306/novair_staging
MIGRATION_DATABASE_URL=mysql://<migration-user>:<encoded-password>@127.0.0.1:3306/novair_staging
```

When the wizard opens, enter your staging hostname and the absolute path to this file. The launcher creates a private checkout under `~/.local/share/novair/releases/`. The wizard installs locked dependencies, builds NovAir, applies the checked-in migrations, and verifies the listener before enabling the user service.

### Verify and connect staging traffic

The installer prefers loopback port **3400** and searches **3400–3499** if that port is taken or reserved. As the NovAir user, check the service with:

```bash
systemctl --user status novair.service
journalctl --user -u novair.service -n 50
```

The Nginx and Apache fragments are saved in `~/.config/novair/` or `$XDG_CONFIG_HOME/novair/`. Use the correct fragment in NovAir’s HTTPS virtual host, validate the complete proxy configuration, and confirm the staging hostname serves the expected homepage with `noindex`. The wizard keeps staging account access and search indexing closed.

### SSH key setup

For a private repository, sign in as the dedicated NovAir user and generate a deployment key, or reuse one that is already authorized for this repository. If the example key file exists, choose another filename.

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C novair-staging -f ~/.ssh/novair_team_ed25519
cat ~/.ssh/novair_team_ed25519.pub
```

Add the public key under **Novair-Team → Settings → Deploy keys → Add deploy key** with write access unchecked. Verify GitHub’s host fingerprint on the first connection. Load a passphrase-protected key into your SSH agent before cloning. [GitHub’s deploy key guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) · [GitHub’s SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)

```bash
git clone --branch main \
  --config core.sshCommand='ssh -o IdentitiesOnly=yes -i ~/.ssh/novair_team_ed25519' \
  git@github.com:Cat-Ghost-Community/Novair-Team.git novair-staging &&
  cd novair-staging &&
  node --experimental-strip-types scripts/install-server.mjs
```

### Update, rehearse rollback, and configure messages

- **Updates** use a separate clean checkout under the same NovAir user. Run `npm run server:update` there. The updater verifies a candidate on a temporary port, retains the current proxy port, and restores the previous NovAir release if the replacement fails readiness. Schema changes require their own migration and restore plan.
- **Rehearsal** runs on a disposable Linux host via `node scripts/rehearse-server.mjs --disposable-linux --database-env /private/rehearsal.env`. Use a dedicated `novair-rehearsal` user and an empty loopback MySQL schema named `novair_rehearsal_<suffix>`. Review the reported evidence for install, update, forced rollback, and neighboring-service probes before using a shared host.
- **Gmail and sms.ir** are configured from the installed checkout with `npm run server:messaging`. For Gmail, use `smtp.gmail.com` with a Google App Password and port 587 or 465. For sms.ir, enter the API key, approved verification template ID, and exact template parameter name. The wizard requests confirmation for each test send. Public email verification, password recovery, and SMS sign-in remain separate from test delivery.

[Deployment readiness](docs/DEPLOYMENT_READINESS.md) · [Release checklist](docs/RELEASE_CHECKLIST.md) · [Testing](docs/TESTING.md)
