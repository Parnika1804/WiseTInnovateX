import sqlite3

conn = sqlite3.connect("eventflow.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("\nDATABASE TABLES:")
for table in tables:
    print("-", table[0])