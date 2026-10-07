# Border Guard Personnel Requests Platform

Web platform that digitizes personnel requests (leave, administrative, financial, certificates)
with an approval workflow and a **minimum manning level check** for leave requests.

- **Backend:** Django + Django REST Framework, JWT auth, SQLite (dev)
- **Frontend:** React (Vite) + MUI, Arabic RTL

## Requirements
- Python 3.12+
- Node.js 20+ (LTS)
- Git

## Backend setup (first time)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env      # then put a new key in .env (see below)
python manage.py migrate
python manage.py seed
python manage.py createsuperuser
python manage.py runserver
```
Generate a key for `.env`:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Frontend setup (first time)
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (use `localhost`, not `127.0.0.1`).

## Test accounts (created by `seed`, password `Test@12345`)
| Military ID | Role | Site |
|---|---|---|
| 1001–1006 | Soldier | North (minimum 5) |
| 2001 | Officer | North |
| 3001 | Finance | North |
| 1101 | Soldier | South (minimum 4) |
| 2101 | Officer | South |

## Rules for the team
- Always activate the venv before `python` commands (the prompt must show `(.venv)`).
- Never commit `.env`, `db.sqlite3`, `media/`, `.venv/` or `node_modules/` (already in `.gitignore`).
- Pull before you start working: `git pull`.