# NovAir

## Quick install

Paste this command into an interactive Bash terminal as the dedicated NovAir Linux user after [preparing the server](#linux-server-installation-guide). It downloads the launcher and opens the setup wizard in the same terminal.

```bash
(
  setup_file="$(mktemp /tmp/novair-setup.XXXXXXXX)" || exit 1
  trap 'rm -f -- "$setup_file"' EXIT
  curl -fsSL https://raw.githubusercontent.com/Cat-Ghost-Community/Novair-Team/main/setup.sh \
    -o "$setup_file" && bash "$setup_file"
)
```

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

### Update, rehearse rollback, and configure messages

- **Updates** use a separate clean checkout under the same NovAir user. Run `npm run server:update` there. The updater verifies a candidate on a temporary port, retains the current proxy port, and restores the previous NovAir release if the replacement fails readiness. Schema changes require their own migration and restore plan.
- **Rehearsal** runs on a disposable Linux host via `node scripts/rehearse-server.mjs --disposable-linux --database-env /private/rehearsal.env`. Use a dedicated `novair-rehearsal` user and an empty loopback MySQL schema named `novair_rehearsal_<suffix>`. Review the reported evidence for install, update, forced rollback, and neighboring-service probes before using a shared host.
- **Gmail and sms.ir** are configured from the installed checkout with `npm run server:messaging`. For Gmail, use `smtp.gmail.com` with a Google App Password and port 587 or 465. For sms.ir, enter the API key, approved verification template ID, and exact template parameter name. The wizard requests confirmation for each test send. Public email verification, password recovery, and SMS sign-in remain separate from test delivery.

[Deployment readiness](docs/DEPLOYMENT_READINESS.md) · [Release checklist](docs/RELEASE_CHECKLIST.md) · [Testing](docs/TESTING.md)
