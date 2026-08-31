# Procurement Foundation Platform (Module 1)

This repository contains the foundation module of the Government Innovation-Procurement Platform. It sets up Authentication & RBAC, Audit Logging, and Generic Cross-Cutting Infrastructure services.

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy 2.0, Alembic migrations, PostgreSQL (`pgvector` Docker image).
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Orchestration**: Docker Compose.

---

## Repository Structure
```
/backend
  /app
    /api        # router resources (auth, users, audit logs, documents, notifications)
    /core       # settings, database sessions, security functions, dependencies
    /models     # SQLAlchemy 2.0 model tables
    /schemas    # Pydantic validation structures
    /services   # audit helper and seeding services
    /tests      # integration test suite
  /alembic      # migration files
  alembic.ini
  Dockerfile
  requirements.txt
/frontend
  /app          # layout, login, and dashboard pages
  Dockerfile
  package.json
  tailwind.config.js
docker-compose.yml
.env.example
.env
```

---

## Setup & Run Instructions

### 1. Environment Configuration
Create a `.env` file at the root by copying `.env.example`:
```bash
cp .env.example .env
```
Ensure you have the required environment variables populated, notably `SEED_ADMIN_PASSWORD` (defaults to `SankalpAdmin2026!` if not modified).

### 2. Launch the Platform
Boot all services (database, backend API, and frontend) using Docker Compose:
```bash
docker compose up -d
```
This builds the custom Docker images and runs the services:
- **FastAPI Backend**: `http://localhost:8000`
- **Next.js Frontend**: `http://localhost:3000`
- **PostgreSQL Database**: `localhost:5432`

### 3. Run Database Migrations
Run the Alembic migrations inside the backend container to construct all tables:
```bash
docker compose run --rm backend alembic upgrade head
```

The startup routine automatically triggers the database seed script to populate:
- The 5 system roles (`SUPER_ADMIN`, `DEPARTMENT_OFFICER`, `EVALUATOR`, `PROCUREMENT_OFFICER`, `STARTUP_USER`)
- The default department: `Skills, Employment, Entrepreneurship and Innovation Dept`
- The default Super Admin: `admin@test.gov.in` (password loaded from `SEED_ADMIN_PASSWORD`)

---

## Testing & Verification

### Run Automated Integration Tests
You can run the fully automated integration test suite which asserts user authentication guards, department/role user creation, document multipart uploads, audit logs matching, and notification reads:
```bash
docker compose exec backend python app/tests/test_flow.py
```

### Manual Verification
1. Access the web dashboard by navigating to `http://localhost:3000/login` in your browser.
2. Log in using:
   - **Email**: `admin@test.gov.in`
   - **Password**: `<your SEED_ADMIN_PASSWORD>` (e.g. `SankalpAdmin2026!`)
3. Upon authentication, you will be redirected to `/dashboard` rendering your account's email, assigned roles, and department.
