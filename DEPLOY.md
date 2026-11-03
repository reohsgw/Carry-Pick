# Deploying CarryPick

The front end (`frontend/`) goes on **Vercel**. The Spring Boot API (`backend/`) can't run on Vercel,
so it goes on a Java-capable host such as **Render**, **Railway** or **Fly.io**.

Deploy the backend first — the frontend needs its URL.

## 1. Backend (Render / Railway / Fly.io)

- Root directory: `backend`
- Build: `mvn -DskipTests package`
- Start: `java -jar target/*.jar` (the port is read from `PORT`, which these hosts set for you)

Environment variables:

| Variable | Value | Required |
|---|---|---|
| `JWT_SECRET` | random string, 32+ characters | yes |
| `APP_CORSORIGINS` | your Vercel URL, e.g. `https://carrypick.vercel.app` (comma separated for several) | yes |
| `SPRING_PROFILES_ACTIVE` | `postgres` — keeps data across restarts | recommended |
| `DB_URL` | `jdbc:postgresql://host:5432/dbname` | with `postgres` profile |
| `DB_USER` / `DB_PASSWORD` | database credentials | with `postgres` profile |
| `PAYMENT_MODE` | `mock` (default) or `toss` with `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | no |
| `AI_PROVIDER` | `mock` (default) or `anthropic` with `ANTHROPIC_API_KEY` | no |
| `UPLOAD_DIR` | path on a persistent disk, if your host offers one | no |

Notes:
- Without the `postgres` profile the API uses in-memory H2: **all data is wiped on every restart/redeploy**.
- Uploaded images are stored on local disk and are lost on redeploy unless `UPLOAD_DIR` points at a persistent disk.

Check it works: open `https://<backend-url>/swagger-ui.html`.

## 2. Frontend (Vercel)

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `frontend` (framework preset: Vite is detected automatically).
3. Add the environment variable `VITE_API_BASE` = `https://<backend-url>` (no trailing slash).
4. Deploy.

`frontend/vercel.json` rewrites all routes to `index.html` so refreshing a page doesn't 404.

`VITE_API_BASE` is baked in at build time — after changing it, redeploy.

## 3. Wire them together

Once Vercel gives you the final URL, make sure it's in the backend's `APP_CORSORIGINS`
and restart the backend.
