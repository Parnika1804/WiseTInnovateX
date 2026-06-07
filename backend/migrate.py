"""
Run this ONCE from your backend folder:
    python migrate.py

Adds any missing columns to the database that were added in recent code updates.
Safe to run multiple times — skips columns that already exist.
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "eventflow.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

migrations = [
    # (table, column, column_definition)
    ("teams",               "event_config_id",     "INTEGER REFERENCES event_configs(id)"),
    ("communication_logs",  "comm_type",            "TEXT DEFAULT 'MANUAL'"),
    ("communication_logs",  "sent_at",              "DATETIME"),
    ("participants",        "source",               "TEXT NOT NULL DEFAULT 'csv'"),
    ("participants",        "registration_status",  "TEXT NOT NULL DEFAULT 'approved'"),
    ("event_configs",       "current_stage_index",  "INTEGER NOT NULL DEFAULT 0"),
    ("communication_logs",  "batch_id",             "TEXT"),
    ("communication_logs",  "approved_by",          "TEXT"),
    ("activity_logs",       "target_entity",        "TEXT"),
    ("activity_logs",       "target_id",            "INTEGER"),
    ("activity_logs",       "ip_address",           "TEXT"),
    ("teams",  "is_qualified",  "BOOLEAN NOT NULL DEFAULT 1"),
    ("scores", "round_number",  "INTEGER NOT NULL DEFAULT 1"),
]

for table, column, definition in migrations:
    cursor.execute(f"PRAGMA table_info({table})")
    existing = [row[1] for row in cursor.fetchall()]
    if column in existing:
        print(f"✓ {table}.{column} already exists, skipping.")
    else:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        conn.commit()
        print(f"✓ Added {table}.{column}")

conn.close()
print("\nAll migrations complete.")