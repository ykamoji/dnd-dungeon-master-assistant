import sqlite3
import json

conn = sqlite3.connect('.adk/session.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM events ORDER BY timestamp ASC")
events = cursor.fetchall()

print("All hitl_gate events:")
for row in events:
    try:
        event = json.loads(row['event_data'])
        node_info = event.get('node_info', {})
        if 'hitl_gate' in node_info.get('path', ''):
            # Print if it has content or interrupt or state
            if 'content' in event:
                print(f"Time: {row['timestamp']} | PATH: {node_info.get('path')} | CONTENT (preview)")
            if event.get('actions', {}).get('requested_interrupts'):
                print(f"Time: {row['timestamp']} | PATH: {node_info.get('path')} | REQUEST_INTERRUPT")
            if event.get('actions', {}).get('state_delta'):
                print(f"Time: {row['timestamp']} | PATH: {node_info.get('path')} | STATE_DELTA: {event['actions']['state_delta']}")
    except Exception as e:
        pass
