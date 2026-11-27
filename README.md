# NovAir

NovAir is the Persian, right-to-left website and customer portal for a two-person digital studio. It includes a public landing page, customer project requests and tracking, support conversations, and an administration area for project management and public content.

**Release status:** The local application is functional. The Linux installer supports protected staging. Public account access still requires a complete email verification and recovery workflow and qualification on the intended host. The messaging wizard configures and tests delivery independently.

- [Clone the repository](#clone-the-repository)
- [Run locally](#run-locally)
- [Install on Linux staging](#install-on-linux-staging)
- [One-command staging install](#one-command-staging-install)
  - [Public quick-install link](#public-repository)
- [Configure Gmail and sms.ir](#configure-gmail-and-smsir)
- [Update and rehearse rollback](#update-and-rehearse-rollback)
- [Testing and maintenance](#testing-and-maintenance)
- [Troubleshooting](#troubleshooting)

## What is included

| Area | Workflows |
| --- | --- |
| Public website | Studio, services, selected work, collaboration process, FAQs, and light and dark themes |
| Customer portal | Local registration and login, project requests, owned projects and history, support tickets, and account settings |
| Administration | Request review, project conversion and scheduling, support replies and private notes, service and portfolio publishing, FAQs, and public contact settings |
| Operations | Linux staging installation, port planning, same-schema updates and rollback, a disposable rehearsal runner, Gmail SMTP and sms.ir test delivery |

The stack is Next.js App Router, strict TypeScript, Tailwind CSS, Prisma, MySQL, and Better Auth. Vazirmatn is hosted locally.

## Clone the repository

[`Cat-Ghost-Community/Novair-Team`](https://github.com/Cat-Ghost-Community/Novair-Team) is currently public. Use the [public quick-install link](#public-repository) or clone over HTTPS. If repository access changes to private, use an SSH key or an authenticated HTTPS clone. Anonymous clones and raw-file requests may return `404` for a private repository.

### SSH key setup

1. Use an existing authorized key, or generate a new Ed25519 key under the user who will clone the project. On a server, use a dedicated key for this repository. If the example filename already exists, reuse the intended key or choose a new filename.

   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ssh-keygen -t ed25519 -C "novair-staging" -f ~/.ssh/novair_team_ed25519
   cat ~/.ssh/novair_team_ed25519.pub
   ```

2. Add only the `.pub` file’s contents to GitHub. For a personal machine, use **Settings → SSH and GPG keys → New SSH key**. For a server, use **Novair-Team → Settings → Deploy keys → Add deploy key** and leave write access unchecked. [GitHub deploy key guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
3. If the key has a passphrase, load it into your existing SSH agent. Start an agent first if the current shell has none:

   ```bash
   if [ -z "${SSH_AUTH_SOCK:-}" ]; then eval "$(ssh-agent -s)"; fi
   ssh-add ~/.ssh/novair_team_ed25519
   ```

4. Test the exact key before cloning. At the first connection, compare the host fingerprint with GitHub’s published values before accepting it. GitHub’s success message can still exit with status `1` because GitHub provides Git access without an interactive shell. [GitHub SSH connection test](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)

   ```bash
   ssh -o IdentitiesOnly=yes -i ~/.ssh/novair_team_ed25519 -T git@github.com
   ```

5. Clone the `main` branch. The clone-specific setting keeps future fetches tied to this key.

   ```bash
   git clone --branch main \
     --config core.sshCommand='ssh -o IdentitiesOnly=yes -i ~/.ssh/novair_team_ed25519' \
     git@github.com:Cat-Ghost-Community/Novair-Team.git novair
   cd novair
   ```

   To switch an existing **Novair-Team** HTTPS checkout to SSH, run from that checkout:

   ```bash
   git remote set-url origin git@github.com:Cat-Ghost-Community/Novair-Team.git
   git config --local core.sshCommand 'ssh -o IdentitiesOnly=yes -i ~/.ssh/novair_team_ed25519'
   ```

### HTTPS with a GitHub token

Create a [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) scoped to **Novair-Team**, with **Contents: Read-only** and an expiration. At Git’s prompts, enter your GitHub username and use the token as the password. Disabling the credential helper for this command keeps the token out of saved Git credentials. Enter it at the prompt so it stays out of the URL and shell history.

```bash
git -c credential.helper= clone --branch main \
  https://github.com/Cat-Ghost-Community/Novair-Team.git novair
cd novair
```

## Run locally

Use Node.js 22 LTS at or above 22.12, or Node.js 24 LTS, with npm. The project also needs Docker Compose or an existing loopback MySQL installation.

### Fresh checkout with Docker Compose

```bash
npm ci
node scripts/setup-local.mjs
npm run db:up
npm run db:init
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Use the exact origin in `SITE_URL`, including its host and port. Local setup generates a private `.env` with random credentials. [`.env.example`](.env.example) lists the local keys. Compose uses MySQL 8.4, exposes it on `127.0.0.1:3307` by default, and persists data in a named volume.

For an existing checkout, keep its environment and database and run `npm run db:check`. If you already run MySQL locally, provision a dedicated schema and configure its loopback `DATABASE_URL`. Percent-encode usernames and passwords in database URLs.

### Native Windows MySQL

After dependency installation and local environment setup, run the following in PowerShell with native MySQL installed:

```powershell
powershell -NoProfile -File scripts/start-local-mysql.ps1
npm run db:init:windows
```

The helper uses the generated local settings and stores database files under `.data`. If the standard development launcher is unavailable, run `npm run build:local` followed by `npm run start`. Stop a running NovAir process before rebuilding the same checkout. Build and typecheck sequentially because Next.js regenerates `.next/types`.

### Local user and administrator access

- Open `/register` to create a USER, `/login` to sign in, and `/dashboard/profile` to manage the account. The local registration flow creates an unverified email address.
- Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong unique `ADMIN_PASSWORD` privately, then run `npm run admin:bootstrap`. Remove the temporary password from the environment afterwards. Bootstrap refuses to promote an existing USER.
- Customers use `/dashboard/requests`, `/dashboard/projects`, and `/dashboard/tickets`. Administrators use `/admin/requests`, `/admin/projects`, `/admin/tickets`, and `/admin/content`.

## Install on Linux staging

Run the install, update, and forced rollback rehearsal on a disposable Linux machine before considering a shared server. If the existing site cannot tolerate shared-resource risk, put NovAir on a separate host.

### Prepare the host

1. Create a dedicated **non-root** Linux user for NovAir. Use a fresh checkout owned by that user, outside a public document root and without `.env`, `.next`, or `node_modules`.
2. Provide supported Node.js and npm, a running **systemd user manager** with lingering enabled, and delegated **cgroup v2 CPU and memory controllers**. The wizard checks for an enforced **2 GiB memory limit** and a **one-core CPU limit** for build tasks, and requires at least **3 GiB available memory** at preflight.
3. Provision an **empty MySQL 8.4 schema** on loopback, named `novair_<suffix>`. Create separate runtime and migration accounts for the same schema. Scope runtime access to application reads and writes and grant migration privileges separately.
4. Prepare a staging DNS name, TLS certificate, and a dedicated virtual host. The wizard generates Nginx and Apache proxy fragments. Apply the appropriate fragment to that staging virtual host only after verifying the backend.

### Preview the port

```bash
node --experimental-strip-types scripts/install-server.mjs --plan --domain staging.example.org
```

The installer prefers port **3400** and searches **3400–3499** when needed. It checks active Linux listeners and reservations in common Nginx and Apache configuration directories. Use `--port NUMBER` to change the preference. Repeat `--reserve-port NUMBER` for known reservations, and repeat `--proxy-config FILE` for additional proxy configuration files. The installer rechecks the port immediately before activation.

### Install

Create a mode-`0600` file owned by the NovAir user outside the checkout. Fill in the real values directly on the staging host:

```dotenv
DATABASE_URL=mysql://<runtime-user>:<encoded-password>@127.0.0.1:3306/novair_staging
MIGRATION_DATABASE_URL=mysql://<migration-user>:<encoded-password>@127.0.0.1:3306/novair_staging
```

Run:

```bash
node --experimental-strip-types scripts/install-server.mjs \
  --domain staging.example.org \
  --database-env /private/novair/database.env
```

The wizard installs locked dependencies, generates Prisma Client, builds NovAir, applies the checked-in migrations, and verifies ownership and readiness on the loopback port before enabling `novair.service`. Installation state and proxy fragments are in `~/.config/novair/` or `$XDG_CONFIG_HOME/novair/`.

```bash
systemctl --user status novair.service
journalctl --user -u novair.service -n 50
```

The existing reverse proxy is under operator control. Keep staging access restricted, validate the complete proxy configuration before reloading it, and verify HTTPS, the canonical origin, homepage readiness, and `noindex`. The current staging profile keeps account access and search indexing closed.

### One-command staging install

Finish [host preparation](#prepare-the-host) and create the [private database credentials file](#install) first. Run one of these blocks in a Bash terminal as the dedicated **non-root** NovAir user. Host packages, database provisioning, DNS, and TLS are prerequisites. The public quick-install launcher fetches the full checkout automatically.

For a rehearsal or shared host, clone and review the release first if you need to pin a specific commit. The shortcuts below use the current `main` branch.

#### Public repository

> [!IMPORTANT]
> This quick-install link requires a **public** repository. Novair-Team is currently public. Run the command as your dedicated NovAir Linux user.

```bash
setup_file="$(mktemp "$HOME/novair-setup.XXXXXXXX")" &&
  curl -fsSL https://raw.githubusercontent.com/Cat-Ghost-Community/Novair-Team/main/setup.sh -o "$setup_file" &&
  bash "$setup_file"
```

The launcher creates a private checkout under `~/.local/share/novair/releases/` and opens the staging wizard. Have your staging domain and the path to your database credentials file ready. The wizard can also accept them through `bash "$setup_file" --domain staging.example.org --database-env /private/novair/database.env`.

#### Private repository with an SSH deploy key

```bash
git clone --branch main \
  --config core.sshCommand='ssh -o IdentitiesOnly=yes -i ~/.ssh/novair_team_ed25519' \
  git@github.com:Cat-Ghost-Community/Novair-Team.git novair-staging &&
  cd novair-staging &&
  node --experimental-strip-types scripts/install-server.mjs \
    --domain staging.example.org --database-env /private/novair/database.env
```

#### Private repository with a GitHub token

Use the username and token prompts described under [HTTPS with a GitHub token](#https-with-a-github-token).

```bash
git -c credential.helper= clone --branch main \
  https://github.com/Cat-Ghost-Community/Novair-Team.git novair-staging &&
  cd novair-staging &&
  node --experimental-strip-types scripts/install-server.mjs \
    --domain staging.example.org --database-env /private/novair/database.env
```

Open the [messaging wizard](#configure-gmail-and-smsir) separately when ready to configure Gmail and sms.ir.

## Configure Gmail and sms.ir

From the NovAir checkout after installing dependencies, run as the dedicated non-root Linux user:

```bash
npm run server:messaging
```

The wizard saves or removes each provider independently, verifies the Gmail connection, and can send one explicitly confirmed test email or SMS. Each test send requires typing `SEND`.

| Provider | What to enter |
| --- | --- |
| Gmail SMTP | Full Gmail or Google Workspace address and a Google App Password. The wizard uses `smtp.gmail.com` with required STARTTLS on port 587 by default. Port 465 uses implicit TLS. |
| sms.ir | API key, approved verification template ID, and its exact parameter name, such as `CODE`. Test with your own Iranian mobile number. A live test can use account credit. |

Use [Google’s App Password instructions](https://support.google.com/accounts/answer/185833) and the [official sms.ir template examples](https://github.com/IPeCompany/SmsPanelV2.TypeScript#sendverifycodemobile-templateid-parameters).

Secret prompts hide input. Settings are stored in an owner-only file at `~/.config/novair-messaging/providers.json` or `$XDG_CONFIG_HOME/novair-messaging/providers.json`. Keep this file outside source control. Verify delivery in the inbox or on the handset after the provider accepts a test. Public email verification, password recovery, and SMS sign-in are separate application workflows that remain unavailable.

## Update and rehearse rollback

### Update an existing staging installation

Prepare a **separate, clean checkout** of the candidate release under the existing NovAir user. From that checkout run:

```bash
npm run server:update
```

The updater checks the recorded runtime configuration and applied migration ledger. It accepts only releases with unchanged Prisma schema and migration files. It builds and checks the candidate on a temporary loopback port, then briefly restarts NovAir on its existing port. If the new release fails readiness, it restores and verifies the previous release. Keep both checkouts and the previous service definition in `previous.unit`.

If rollback cannot be verified, retain the files and inspect the NovAir unit’s journal before attempting another update. Schema-changing releases require a separate, rehearsed migration and restore procedure.

### Run the disposable rehearsal

Use a fresh non-root user called `novair-rehearsal` or `novair-rehearsal-<suffix>`, with lingering and cgroup delegation. Provision a dedicated empty loopback MySQL 8.4 schema named `novair_rehearsal_<suffix>` and prepare the same two-account private credential file.

```bash
node scripts/rehearse-server.mjs --disposable-linux \
  --database-env /private/rehearsal.env
```

The runner installs, updates, injects an HTTP failure after cutover, verifies rollback, and probes a separate fixture HTTP service throughout. Review the private logs and `evidence.json` in the printed artifact directory. The full Linux rehearsal is pending. A fixture pass still leaves real-host resource, TLS, proxy, backup, and provider-delivery verification.

## Testing and maintenance

| Command | What it checks |
| --- | --- |
| `npm test` | Native unit and contract tests, including installer, rollback, and messaging |
| `npm run test:server-install` | Installer-focused regression and rehearsal fixture contracts |
| `npm run lint` / `npm run typecheck` | ESLint and strict TypeScript |
| `npm run build:local` / `npm run build` | Worker-thread local build or standard Next.js production build |
| `npm run db:check` / `npm run db:verify` | Local connectivity and MySQL integrity |
| `npm run test:http` | HTTP regression checks against the running local site |
| `npm run test:release` | Isolated MySQL security and business regressions via the PowerShell harness |
| `npm run test:smoke` | Playwright smoke tests |
| `npm run auth:cleanup` | Remove expired local sessions, verification rows, and rate-limit counters |
| `npm run release:check` | Check recorded qualification evidence against the current source and build |

The PowerShell release harness requires the private local `MYSQL_ROOT_PASSWORD`, a built app, and an unused port 3100. It creates and cleans up an owned test database. To exercise the retained Chromium scenarios with a freshly launched local browser:

```powershell
npx playwright install chromium
$env:NOVAIR_BROWSER_LAUNCH = '1'
powershell -NoProfile -File scripts/verify-release.ps1 -Browser
```

Verification output in `test-results/` stays local. A fresh checkout or new build may require new release evidence. See [Testing](docs/TESTING.md) for detailed coverage and historical evidence. Before launch, qualify encrypted backups and restore, monitoring, maintenance scheduling, the real canonical domain, and indexing.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No port candidate | Review live listeners, add reserved ports or proxy configuration files, or change the preferred port. |
| Build preflight fails | Check the systemd user manager, cgroup delegation, and available memory. Rehearse on a separate host if the shared server cannot meet the limits. |
| Local login fails | Confirm `AUTH_ENABLED=true`, a private `BETTER_AUTH_SECRET`, and an origin exactly matching `SITE_URL`. |
| Prisma fails to start | Generate Prisma Client on the OS and architecture where it will run and verify the database credentials. |
| Gmail connection fails | Check outbound SMTP access and whether the Google account permits App Passwords. |
| sms.ir rejects a test | Check API credit, template approval, the parameter’s exact spelling, and the test number. Review the provider log before retrying an ambiguous result. |
| An update refuses to proceed | Review the installed unit, private runtime settings, and migration history. Preserve the current working release while diagnosing. |

## Project references

- [Architecture](docs/ARCHITECTURE.md) and [Design system](docs/DESIGN_SYSTEM.md)
- [Authentication](docs/AUTHENTICATION.md), [Requests](docs/REQUESTS.md), and [Project management](docs/PROJECT_MANAGEMENT.md)
- [Customer projects](docs/CUSTOMER_PROJECTS.md), [Support tickets](docs/SUPPORT_TICKETS.md), and [Content management](docs/CONTENT_MANAGEMENT.md)
- [Deployment readiness](docs/DEPLOYMENT_READINESS.md), [Release checklist](docs/RELEASE_CHECKLIST.md), and [Implementation status](docs/IMPLEMENTATION_STATUS.md)
