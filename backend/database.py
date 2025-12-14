from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

import os
from dotenv import load_dotenv

load_dotenv()

# Use DATABASE_URL from env if available, else default to sqlite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./slowlogs.db")

if DATABASE_URL.startswith("postgres"):
    # Postgres requires psycopg2 driver usually denoted but standard URL is fine
    # Ensure arguments are compatible (check_same_thread is sqlite only)
    connect_args = {}
else:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SlowQuery(Base):
    __tablename__ = "slow_queries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration_ms = Column(Float)
    query_text = Column(Text)
    query_type = Column(String)  # SELECT, INSERT, UPDATE, etc.
    log_file = Column(String)
    db_name = Column(String)
    user_name = Column(String)
    
    user_name = Column(String)
    query_hash = Column(String, index=True)

    __table_args__ = (
        UniqueConstraint('log_file', 'timestamp', 'query_hash', name='uq_log_timestamp_hash'),
    )

class DbError(Base):
    __tablename__ = "db_errors"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    error_level = Column(String) # ERROR, FATAL, PANIC
    message = Column(Text)
    log_file = Column(String)
    db_name = Column(String)
    user_name = Column(String)
    message_hash = Column(String, index=True)

    __table_args__ = (
        UniqueConstraint('log_file', 'timestamp', 'message_hash', name='uq_err_log_time_hash'),
    )

class LogState(Base):
    __tablename__ = "log_state"

    log_file_name = Column(String, primary_key=True)
    marker = Column(String, default="0")
    last_updated = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
