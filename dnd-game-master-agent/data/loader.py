"""
Data loader for Open5e entities.

This module provides helpers to load JSON data fetched from the Open5e API
and look up entities (spells, monsters, etc.) by their name.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_DATA_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def get_data_dir() -> str:
    """Get the absolute path to the data/open5e directory."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "open5e")

def load_resource(resource: str) -> List[Dict[str, Any]]:
    """
    Load a resource from its JSON file.
    Caches the data in memory after the first load.
    
    Args:
        resource: The name of the resource (e.g., 'spells', 'monsters').
        
    Returns:
        A list of dictionaries representing the entities.
    """
    if resource in _DATA_CACHE:
        return _DATA_CACHE[resource]
        
    file_path = os.path.join(get_data_dir(), f"{resource}.json")
    if not os.path.exists(file_path):
        logger.warning(f"Data file for {resource} not found at {file_path}. Did you run fetch_open5e.py?")
        return []
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _DATA_CACHE[resource] = data
            return data
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON for {resource}: {e}")
        return []
    except Exception as e:
        logger.error(f"Error loading {resource}: {e}")
        return []

def lookup_by_name(resource: str, name: str, case_sensitive: bool = False) -> Optional[Dict[str, Any]]:
    """
    Look up a specific entity by its name within a resource.
    
    Args:
        resource: The name of the resource to search in.
        name: The name of the entity to find.
        case_sensitive: Whether the name match should be case-sensitive.
        
    Returns:
        The entity dictionary if found, else None.
    """
    data = load_resource(resource)
    if not data:
        return None
        
    target_name = name if case_sensitive else name.lower()
    
    for item in data:
        item_name = item.get("name", "")
        if not case_sensitive:
            item_name = item_name.lower()
            
        if item_name == target_name:
            return item
            
    return None

def search_by_name(resource: str, query: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
    """
    Search for entities that contain the given query in their name.
    
    Args:
        resource: The name of the resource to search in.
        query: The substring to search for in the name.
        case_sensitive: Whether the search should be case-sensitive.
        
    Returns:
        A list of matching entity dictionaries.
    """
    data = load_resource(resource)
    if not data:
        return []
        
    target_query = query if case_sensitive else query.lower()
    results = []
    
    for item in data:
        item_name = item.get("name", "")
        if not case_sensitive:
            item_name = item_name.lower()
            
        if target_query in item_name:
            results.append(item)
            
    return results
