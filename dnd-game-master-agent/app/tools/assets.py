import os
import re
from typing import Dict

# Cache for asset lookup table
_ASSET_DB: Dict[str, Dict[str, str]] = {}
_LOADED = False

BASE_ASSET_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/ToA/"

def _load_assets():
    global _LOADED
    if _LOADED:
        return
        
    agent_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = os.path.dirname(agent_root)
    assets_path = os.path.join(project_root, "assets", "Tomb-of-Annihilation", "ASSETS.md")
    
    if not os.path.exists(assets_path):
        _LOADED = True
        return
        
    try:
        with open(assets_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        current_section = ""
        for line in lines:
            line = line.strip()
            if line.startswith("## "):
                current_section = line[3:].strip()
            elif line.startswith("| `") and "` |" in line:
                # Parse markdown table row: | `004-0201.webp` | Chapter 1: Port Nyanzaru |
                match = re.match(r"\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|", line)
                if match:
                    filename = match.group(1).strip()
                    desc = match.group(2).strip()
                    url = BASE_ASSET_URL + filename
                    
                    _ASSET_DB[desc.lower()] = {
                        "url": url,
                        "file": filename,
                        "description": desc,
                        "section": current_section
                    }
    except Exception as e:
        print(f"Error loading ASSETS.md: {e}")
        
    _LOADED = True

def get_asset_url(description: str) -> Dict[str, str]:
    """Resolve an image URL from ASSETS.md by fuzzy-matching description."""
    _load_assets()
    target = description.lower().strip()
    
    # 1. Exact match
    if target in _ASSET_DB:
        return _ASSET_DB[target]
        
    # 2. Substring match (shortest match string preferred)
    best_match = None
    best_len = float('inf')
    
    for key, data in _ASSET_DB.items():
        if target in key or key in target:
            if len(key) < best_len:
                best_len = len(key)
                best_match = data
                
    if best_match:
        return best_match
        
    return {"error": "no match found"}
