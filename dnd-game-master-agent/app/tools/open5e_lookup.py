import os
import sys
from typing import Dict, Optional

# Add data/ to sys.path if not there so we can import data.loader
# Since app/tools is inside dnd-game-master-agent, we can add the agent root to sys.path
agent_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if agent_root not in sys.path:
    sys.path.insert(0, agent_root)

from data.loader import lookup_by_name

def lookup_monster(name: str) -> Optional[Dict]:
    """Fallback: look up a monster from Open5e data."""
    return lookup_by_name("monsters", name)

def lookup_spell(name: str) -> Optional[Dict]:
    """Look up a spell by name from Open5e data."""
    return lookup_by_name("spells", name)

def lookup_class(name: str) -> Optional[Dict]:
    """Look up a D&D class by name from Open5e data."""
    return lookup_by_name("classes", name)
