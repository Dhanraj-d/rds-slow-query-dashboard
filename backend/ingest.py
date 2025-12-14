import boto3
import re
import time
import os
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, SlowQuery, DbError, init_db, LogState
from sqlalchemy.exc import IntegrityError
import hashlib

load_dotenv()

# === Configuration ===
# Defaults can be overridden by Environment Variables
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
DB_IDENTIFIER = os.getenv("DB_IDENTIFIER", "production-leap-db")
MIN_DURATION_MS = 5000  # threshold in ms

# === Regex ===
# User provided regex
REGEX = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC):[^:]+:(?P<userdb>[^:]+):.*?duration: (?P<duration>\d+\.?\d*) ms\s+(?:statement|execute [^:]*): (?P<query>.+)$",
    re.MULTILINE
)

ERROR_REGEX = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC):[^:]+:(?P<userdb>[^:]+):(?:\[\d+\]:)?(?P<level>FATAL|ERROR|PANIC):\s+(?P<message>.+)$",
    re.MULTILINE
)

def get_db_client():
    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        # Try finding credentials from default session (e.g. ~/.aws/credentials) if env vars missing
        return boto3.client("rds", region_name=AWS_REGION)
    
    return boto3.client(
        "rds",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION,
    )

def get_last_n_postgres_logs(client, n=4):
    print(f"🔍 Fetching log files for {DB_IDENTIFIER}...")
    response = client.describe_db_log_files(DBInstanceIdentifier=DB_IDENTIFIER)
    postgres_logs = [
        log["LogFileName"] 
        for log in response["DescribeDBLogFiles"] 
        if log["LogFileName"].startswith("error/postgresql.log")
    ]
    if not postgres_logs:
        print("⚠️ No postgres logs found")
        return []
    
    # Sort logs and take last n
    last_n_logs = sorted(postgres_logs)[-n:]
    print(f"Processing logs: {last_n_logs}")
    return last_n_logs

def process_log_data(log_data: str, log_file_name: str, db: Session):
    # 1. Process Slow Queries
    matches = REGEX.findall(log_data)
    count = 0
    
    # 2. Process Errors
    error_matches = ERROR_REGEX.findall(log_data)
    error_count = 0

    # Handle Slow Queries
    for timestamp_str, userdb, duration, query in matches:
        duration_ms = float(duration)
        if duration_ms < MIN_DURATION_MS:
            continue

        query = query.strip()
        query_type = (
            "SELECT" if "select" in query.lower()
            else "WRITE" if any(x in query.lower() for x in ["insert", "update", "delete"])
            else "OTHER"
        )
        
        # Parse db_name and user_name
        db_name = userdb.split('@')[-1] if '@' in userdb else 'unknown'
        user_name = userdb.split('@')[0] if '@' in userdb else 'unknown'
        
        # Parse timestamp (e.g. 2025-11-06 13:00:06 UTC)
        # remove ' UTC' and parse
        try:
            ts = datetime.strptime(timestamp_str.replace(' UTC', ''), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = datetime.utcnow()
        
        # Calculate Hash
        query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()

        db_entry = SlowQuery(
            timestamp=ts,
            duration_ms=duration_ms,
            query_text=query,
            query_type=query_type,
            log_file=log_file_name,
            db_name=db_name,
            user_name=user_name,
            query_hash=query_hash
        )
        try:
            db.add(db_entry)
            db.flush() # Check for integrity error immediately
            count += 1
        except IntegrityError:
            db.rollback()
            # Duplicate found, skip
            pass
    
    # Handle Errors
    for timestamp_str, userdb, level, message in error_matches:
        db_name = userdb.split('@')[-1] if '@' in userdb else 'unknown'
        user_name = userdb.split('@')[0] if '@' in userdb else 'unknown'
        try:
            ts = datetime.strptime(timestamp_str.replace(' UTC', ''), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = datetime.utcnow()
            
        message = message.strip()
        msg_hash = hashlib.md5(message.encode('utf-8') + str(ts).encode('utf-8')).hexdigest()

        err_entry = DbError(
            timestamp=ts,
            error_level=level,
            message=message,
            log_file=log_file_name,
            db_name=db_name,
            user_name=user_name,
            message_hash=msg_hash
        )
        try:
            db.add(err_entry)
            db.flush()
            error_count += 1
        except IntegrityError:
            db.rollback()
            pass
    
    db.commit()
    db.commit()
    return count + error_count

def ingest_logs():
    print("📥 Starting ingestion process...")
    # Ensure DB is init (schema created if not exists)
    init_db()
    db = SessionLocal()
    
    try:
        client = get_db_client()

        # Fetch last 4 logs using the new helper
        log_files = get_last_n_postgres_logs(client, n=4)
        
        total_queries = 0

        for log_file_name in log_files:
            print(f"📄 Processing: {log_file_name}")
            # Retrieve or initialize LogState for this file
            state = db.query(LogState).filter(LogState.log_file_name == log_file_name).first()
            if not state:
                marker = "0"
                state = LogState(log_file_name=log_file_name, marker=marker)
                db.add(state)
                db.commit()
                db.refresh(state)
            else:
                marker = state.marker
                print(f"   Resuming from marker: {marker}")

            while True:
                response = client.download_db_log_file_portion(
                    DBInstanceIdentifier=DB_IDENTIFIER,
                    LogFileName=log_file_name,
                    Marker=marker,
                    NumberOfLines=2000,
                )

                log_data = response["LogFileData"]
                if log_data:
                    count = process_log_data(log_data, log_file_name, db)
                    total_queries += count

                # Update marker in DB
                marker = response["Marker"]
                state.marker = marker
                state.last_updated = datetime.utcnow()
                db.commit()

                if not response["AdditionalDataPending"]:
                    break

                time.sleep(0.5) 

        print(f"✅ Ingestion complete. Imported {total_queries} queries.")
        return {"status": "success", "imported": total_queries}

    except Exception as e:
        print(f"❌ Error during ingestion: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    ingest_logs()
