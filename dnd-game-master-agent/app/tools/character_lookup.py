import csv
import os
from typing import Dict, Optional

# Cache for parsed characters
_CHARACTER_DB: Dict[str, Dict] = {}
_LOADED = False

def _load_db():
    global _LOADED
    if _LOADED:
        return
        
    # docs/ and assets/ live inside the agent dir (= agent_root).
    agent_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = agent_root
    csv_path = os.path.join(project_root, "docs", "Tomb-of-Annihilation", "Appendix D.csv")
    
    if not os.path.exists(csv_path):
        _LOADED = True
        return
        
    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("Name", "").strip()
                if name:
                    _CHARACTER_DB[name.lower()] = dict(row)
    except Exception as e:
        print(f"Error loading Appendix D.csv: {e}")
        
    _LOADED = True

def lookup_character(name: str) -> Optional[Dict]:
    """Look up an NPC or monster by name from Appendix D.csv.
    
    Returns the full stat block as a dictionary, or None if not found.
    """
    _load_db()
    return _CHARACTER_DB.get(name.lower().strip())
