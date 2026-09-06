# REXA / VOX Portfolio

A one-page video-editor portfolio built with Django, SQLite/Postgres, HTML, CSS, and vanilla JavaScript.

## Features

- YouTube and Shorts embeds managed from Django admin
- Editable website copy grouped by section in **Site content**
- Contact form with name, email, and project description
- Contact-message inbox in Django admin
- Responsive public site and custom VOX-styled admin
- SQLite for local development and Postgres through `DATABASE_URL` in production

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open the site at `http://127.0.0.1:8000/` and the admin at
`http://127.0.0.1:8000/admin/`.

The local `db.sqlite3` file is intentionally excluded from Git. Migrations seed
the four portfolio videos and the initial website copy in every new database.

## Content management

- **Site content** opens the single editor for all public website text and links.
- **Work projects** manages a YouTube URL, title, and short description.
- **Contact messages** contains submitted name, email, and project description.

## Deploy on Vercel

Vercel detects `manage.py`, the WSGI application, and Django static files. The
build hook in `pyproject.toml` runs database migrations and optionally creates
the first administrator.

1. Import the GitHub repository into Vercel.
2. In the Vercel project's **Storage** tab, add a Postgres integration such as
   Neon. It must provide the `DATABASE_URL` environment variable; hosted SQLite
   is not persistent on Vercel.
3. Add these environment variables for Production (and Preview when needed):

   - `DJANGO_SECRET_KEY`: a long random value
   - `DJANGO_SUPERUSER_USERNAME`: initial admin username
   - `DJANGO_SUPERUSER_EMAIL`: initial admin email
   - `DJANGO_SUPERUSER_PASSWORD`: strong initial admin password

4. Deploy. Migrations create the schema and seed content automatically.
5. Sign in at `https://your-domain/admin/` and change the initial admin password.

For a custom domain, also set:

```text
DJANGO_ALLOWED_HOSTS=example.com,www.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
```

Never commit real secrets or a production database URL. See Vercel's official
[Django template](https://vercel.com/templates/template/django-hello-world) and
[Postgres documentation](https://vercel.com/docs/postgres) for platform setup.
