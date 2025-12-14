# RDS Leap - Slow Query Dashboard

## Tech Stack

### Frontend
*   **Framework**: React (Vite)
*   **HTTP Client**: Axios
*   **Styling**: Pure CSS (Glassmorphism design), Lucide React (Icons)
*   **Port**: 5173 (Development/Preview)

### Backend
*   **Framework**: FastAPI (Python 3.x)
*   **Server**: Uvicorn (ASGI)
*   **ORM**: SQLAlchemy
*   **Database**: PostgreSQL
*   **Cloud Integration**: AWS Boto3 (RDS Log Download)
*   **Port**: 8000

## Operational Commands (Remote Server)

### Backend (FastAPI)

**Start:**
```bash
cd ~/rds_dashboard/backend
nohup ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &
```

**Stop:**
```bash
pkill -f uvicorn
# OR find PID and kill manually
pgrep -a -f uvicorn
kill <PID>
```

**Verify Status:**
```bash
pgrep -a -f uvicorn
tail -f ~/rds_dashboard/backend/uvicorn.log
```

---

### Frontend (Vite Dev Server)

*Note: Currently running in dev mode (`npm run dev`) for hot-reloading.*

**Start:**
```bash
cd ~/rds_dashboard/frontend
nohup npm run dev -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
```

**Stop:**
```bash
pkill -f vite
# OR
fuser -k 5173/tcp
```

**Verify Status:**
```bash
pgrep -a -f vite
tail -f ~/rds_dashboard/frontend/frontend.log
```

## Directory Structure
*   `~/rds_dashboard/backend` - Python API code, `.env`, `venv`
*   `~/rds_dashboard/frontend` - React source code, `node_modules`
