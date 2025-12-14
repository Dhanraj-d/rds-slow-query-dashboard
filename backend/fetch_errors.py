import re
import os
import hashlib
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from database import SessionLocal, DbError, init_db

# Configuration
LOG_FILE = "error_sample.log"

# Regex
ERROR_REGEX = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC):[^:]+:(?P<userdb>[^:]+):(?:\[\d+\]:)?(?P<level>FATAL|ERROR|PANIC):\s+(?P<message>.+)$",
    re.MULTILINE
)

def process_log_file(filename):
    print(f"📄 Processing {filename}...")
    
    if not os.path.exists(filename):
        print(f"❌ File {filename} not found.")
        return

    with open(filename, 'r') as f:
        log_data = f.read()

    db = SessionLocal()
    init_db() # Ensure tables exist

    matches = ERROR_REGEX.findall(log_data)
    print(f"🔍 Found {len(matches)} error lines.")
    
    count = 0
    for timestamp_str, userdb, level, message in matches:
        # Parse db_name and user_name
        db_name = userdb.split('@')[-1] if '@' in userdb else 'unknown'
        user_name = userdb.split('@')[0] if '@' in userdb else 'unknown'
        
        try:
            ts = datetime.strptime(timestamp_str.replace(' UTC', ''), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = datetime.utcnow()
            
        message = message.strip()
        # Create Hash to prevent duplicates (same logic as ingest.py)
        msg_hash = hashlib.md5(message.encode('utf-8') + str(ts).encode('utf-8')).hexdigest()

        err_entry = DbError(
            timestamp=ts,
            error_level=level,
            message=message,
            log_file=filename,
            db_name=db_name,
            user_name=user_name,
            message_hash=msg_hash
        )
        
        try:
            db.add(err_entry)
            db.flush()
            count += 1
            print(f"   [ADDED] {ts} - {level}: {message[:50]}...")
        except IntegrityError:
            db.rollback()
            print(f"   [SKIP] Duplicate found: {message[:30]}...")
            pass
        except Exception as e:
            db.rollback()
            print(f"   [ERROR] Failed to insert: {e}")

    db.commit()
    db.close()
    print(f"✅ Finished. Inserted {count} errors.")

def check_db():
    print("\n--- Verifying Database Content ---")
    db = SessionLocal()
    errors = db.query(DbError).all()
    print(f"Total Errors in DB: {len(errors)}")
    for e in errors:
        print(f" - {e.timestamp} [{e.error_level}] {e.db_name}: {e.message}")
    db.close()

if __name__ == "__main__":
    process_log_file(LOG_FILE)
    check_db()
