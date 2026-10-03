# Nhost setup (you do this in the GUI)

Coding is already wired for Nhost Postgres + Storage. You only configure the project and paste values into `backend/.env`.

**Do not paste secrets into chat** — only into your local `.env`.

---

## 1. Create project

1. Go to [https://app.nhost.io](https://app.nhost.io) and sign in.
2. **Create project** → pick a free/hobby region (e.g. closest to you).
3. Wait until the project status is ready (green).

---

## 2. Postgres connection string → `DATABASE_URL`

You are on the right page (**Settings → Database**). That top section (Postgres version / 1 GB storage) is **not** where the URI lives.

Nhost **hides the connection string until public access is turned on** (Starter default = private).

### Critical: Public Access must be ON

If Alembic fails with:

```text
FATAL: no authentication method is found
```

that is **not** a wrong password. Nhost’s public PgBouncer is reachable, but **public access / HBA is not allowing your laptop**. Password is never even checked.

On **Settings → Database**:

1. Scroll past Postgres Version / Storage / PITR.
2. Find **Public Access** → turn **ON** → click the blue **Save** (wait until it finishes deploying — can take 1–2 minutes).
3. If you see **Allowed CIDRs** / IP allowlist:
   - Leave it **empty** (allow all) while testing, **or**
   - Add your public IP as `x.x.x.x/32`.
4. **Reset database password** on that page → type a simple password with **no `@`** (e.g. `Apple3000NhostDb`) → click **Reset** / **Save** (the confirm button matters).
5. **Copy the connection string shown in the UI after public access is enabled** — do not invent the host/db name. Paste into `.env` as `DATABASE_URL=...` and append `?sslmode=require` if missing.

Example shape (yours may differ slightly — trust the dashboard):

```bash
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@YOUR_SUBDOMAIN.db.ap-south-1.nhost.run:5432/postgres?sslmode=require
```

Also check **Settings → Configuration Editor** (or `nhost.toml`) for:

```toml
[postgres.resources]
enablePublicAccess = true
```

If that is `false`, set `true`, save/deploy, wait, then retry `alembic upgrade head`.

---

## 3. Admin secret, subdomain, region

### Admin secret — important

If you see:

```text
{{ secrets.HASURA_GRAPHQL_ADMIN_SECRET }}
```

that is **not** the secret. It is a **placeholder** that points at a value stored under Secrets.

**Do not** put the curly-brace text into `.env`.

Get the real value:

Nhost’s **Secrets** list often looks “empty” — that is normal. Values are **never shown in the table**; only names are.

1. Stay on **Settings → Secrets**.
2. On the row **`HASURA_GRAPHQL_ADMIN_SECRET`**, click the **⋮** (three dots) on the right.
3. Choose **Edit** / **Update** / **View** (wording varies).
4. Either **copy the existing value** if shown, or **set a new password-like string yourself**, Save, and use that same string in `.env`.
5. Fallback: **Settings → Hasura** — Admin Secret field with reveal/copy.
6. Fallback 2: open **Hasura Console** from the project; the admin secret is what you paste when Hasura asks, or check the launch URL / “Open Hasura” flow.

Then in `backend/.env`:

```bash
NHOST_ADMIN_SECRET=the_actual_secret_string_without_braces
```

### Subdomain + region

These are often on the project home, not under Database:

1. Open the **PitchGround** project overview / home (click the project name in the top breadcrumb, or Overview).
2. Look for **Subdomain** and **Region** cards / “Backend URL” / “App URL”.
3. Or **Settings → General**.

**Trick if the labels are missing:** open any service URL Nhost shows (Hasura / GraphQL / Auth). It looks like:

```text
https://<SUBDOMAIN>.graphql.<REGION>.nhost.run
https://<SUBDOMAIN>.auth.<REGION>.nhost.run
https://<SUBDOMAIN>.storage.<REGION>.nhost.run
```

Example: `https://abcd1234.graphql.eu-central-1.nhost.run`  
→ `NHOST_SUBDOMAIN=abcd1234`  
→ `NHOST_REGION=eu-central-1`

Full block for `.env`:

```bash
STORAGE_BACKEND=nhost
NHOST_SUBDOMAIN=your-subdomain
NHOST_REGION=eu-central-1
NHOST_ADMIN_SECRET=paste_real_secret_here
NHOST_STORAGE_BUCKET=attempt-media
```

---

## 4. Create storage bucket `attempt-media`

1. Open **Storage** in the Nhost sidebar.
2. Create a bucket named exactly: `attempt-media`  
   (or change `NHOST_STORAGE_BUCKET` to match whatever name you create).
3. Prefer **private** bucket (backend uses the admin secret to upload/download).

If Nhost already has a `default` bucket and you want to use that instead:

```bash
NHOST_STORAGE_BUCKET=default
```

---

## 5. Allow backend to write tables (Hasura track — optional)

Alembic / SQLAlchemy will create tables via the Postgres connection directly. You do **not** need to create tables by hand in the GUI.

After the first backend start (or `alembic upgrade head`):

1. Open **Hasura Console** from Nhost (Database / Data).
2. Click **Track all** (or track tables individually) so they appear in the GUI:
   - `learners`, `sessions`, `attempts`, `transcripts`, `attempt_metrics`
   - `diagnoses`, `challenges`, `comparisons`
   - `learner_dimension_scores`, `profile_snapshots`, `question_bank`, …

Then you can browse rows like Supabase’s Table Editor.

---

## 6. Run migrations + backend

From your machine:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# create tables on Nhost Postgres
alembic upgrade head

# start API
uvicorn app.main:app --reload --port 8000
```

On startup the app also runs `create_all` + seeds `question_bank` if empty.

---

## 7. Verify in the GUI

1. Log in on the website (demo or Google) and run a short interview.
2. In Nhost **Hasura / Data**: open `learners` → your row; `sessions` → new session; `attempt_metrics` → JSON scores.
3. In **Storage → attempt-media**: audio/video files for attempts.

---

## Fallback while Nhost is empty

Leave these unset / local to keep developing offline:

```bash
# omit DATABASE_URL or:
DATABASE_URL=sqlite:///./data/pitchground.db
STORAGE_BACKEND=local
```

Switch to Nhost values when your project is ready.
