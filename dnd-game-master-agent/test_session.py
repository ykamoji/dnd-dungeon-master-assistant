import sqlite3
import json

conn = sqlite3.connect('.adk/session.db')
cursor = conn.cursor()
# In ADK, session.db stores events. Let's see the user's inputs.
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)
for table in tables:
    if table[0] in ['events', 'sessions', 'runs']:
        print(f"\n--- Table: {table[0]} ---")
        cursor.execute(f"SELECT * FROM {table[0]} ORDER BY rowid DESC LIMIT 5")
        rows = cursor.fetchall()
        for r in rows:
            print(r)
