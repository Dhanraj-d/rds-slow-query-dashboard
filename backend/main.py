from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import SessionLocal, SlowQuery, init_db
import ingest

app = FastAPI(title="RDS Slow Query Dashboard API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models
class QueryOut(BaseModel):
    id: int
    timestamp: datetime
    duration_ms: float
    query_text: str
    query_type: str
    log_file: str
    db_name: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        orm_mode = True

class StatsOut(BaseModel):
    total_queries: int
    avg_duration: float
    max_duration: float
    by_type: dict

# Routes
@app.get("/queries", response_model=List[QueryOut])
def get_queries(
    skip: int = 0, 
    limit: int = 50, 
    min_duration: Optional[float] = None,
    query_type: Optional[str] = None,
    db_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SlowQuery)
    
    if min_duration:
        query = query.filter(SlowQuery.duration_ms >= min_duration)
    if query_type:
        query = query.filter(SlowQuery.query_type == query_type)
    if db_name:
        query = query.filter(SlowQuery.db_name == db_name)
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(SlowQuery.timestamp >= sd)
        except ValueError:
            pass # Ignore invalid dates
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(SlowQuery.timestamp <= ed)
        except ValueError:
            pass # Ignore invalid dates
        
    return query.order_by(desc(SlowQuery.timestamp)).offset(skip).limit(limit).all()

@app.get("/databases")
def get_databases(db: Session = Depends(get_db)):
    # Get distinct database names
    dbs = db.query(SlowQuery.db_name).distinct().all()
    # dbs is list of tuples [('db1',), ('db2',)]
    return [d[0] for d in dbs if d[0]]

@app.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(SlowQuery).count()
    if total == 0:
        return {
            "total_queries": 0, 
            "avg_duration": 0, 
            "max_duration": 0, 
            "by_type": {}
        }
        
    avg_dur = db.query(func.avg(SlowQuery.duration_ms)).scalar() or 0
    max_dur = db.query(func.max(SlowQuery.duration_ms)).scalar() or 0
    
    # Group by type
    type_counts = db.query(SlowQuery.query_type, func.count(SlowQuery.id)).group_by(SlowQuery.query_type).all()
    by_type = {t: c for t, c in type_counts}
    
    return {
        "total_queries": total,
        "avg_duration": round(avg_dur, 2),
        "max_duration": round(max_dur, 2),
        "by_type": by_type
    }

@app.post("/ingest")
def trigger_ingest(background_tasks: BackgroundTasks):
    # Run ingestion in background to not block
    background_tasks.add_task(ingest.ingest_logs)
    return {"message": "Ingestion started in background"}

@app.get("/health")
def health():
    return {"status": "ok"}
