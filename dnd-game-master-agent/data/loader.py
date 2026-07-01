"""
Data loader for Open5e entities.

This module provides helpers to load JSON data fetched from the Open5e API
and look up entities (spells, monsters, etc.) by their name.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Union

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

def apply_rules(resource: str, item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies filtering and formatting rules to a resource item.
    """
    rules = {
        "classes": {
            "fields": {
                "name": "class_name",
                "desc": "class_description",
                "hit_dice": "class_hit_dice",
                "hp_at_1st_level": "class_hp_at_1st_level",
                "hp_at_higher_levels": "class_hp_at_higher_levels",
                "prof_armor": "class_proficient_armor",
                "prof_weapons": "class_proficient_weapons",
                "prof_tools": "class_proficient_tools",
                "prof_saving_throws": "class_characteristics",
                "prof_skills": "class_proficient_skills",
                "equipment": "class_equipment",
                "table": "class_table",
                "spellcasting_ability": "class_spellcasting_ability"
            },
            "empty_checks": {
                "prof_tools": ""
            }
        },
        "armor": {
            "fields": {
                "name": "armor_name",
                "category": "armor_category",
                "plus_flat_mod": "armor_plus_flat_modifier",
                "plus_max": "armor_plus_max",
                "cost": "armor_cost"
            }
        },
        "backgrounds": {
            "fields": {
                "name": "background_name",
                "desc": "history",
                "skill_proficiencies": "background_skill_proficiencies",
                "tool_proficiencies": "background_tool_proficiencies",
                "equipment": "background_equipment",
                "feature": "background_feature",
                "feature_desc": "background_feature_desc",
                "suggested_characteristics": "background_suggested_characteristics"
            }
        },
        "background": {
            "fields": {
                "name": "background_name",
                "desc": "history",
                "skill_proficiencies": "background_skill_proficiencies",
                "tool_proficiencies": "background_tool_proficiencies",
                "equipment": "background_equipment",
                "feature": "background_feature",
                "feature_desc": "background_feature_desc",
                "suggested_characteristics": "background_suggested_characteristics"
            }
        },
        "magicitems": {
            "fields": {
                "name": "magicitem_name",
                "type": "magicitem_type",
                "desc": "magicitem_description",
                "rarity": "magicitem_rarity"
            }
        },
        "monsters": {
            "fields": {
                "name": "monster_name",
                "size": "monster_size",
                "type": "monster_type",
                "alignment": "monster_alignment",
                "hit_points": "monster_hit_points",
                "hit_dice": "monster_hit_dice",
                "speed": "monster_speed",
                "strength": "monster_strength",
                "dexterity": "monster_dexterity",
                "constitution": "monster_constitution",
                "intelligence": "monster_intelligence",
                "wisdom": "monster_wisdom",
                "charisma": "monster_charisma",
                "skills": "monster_skills",
                "actions": "monster_actions",
                "special_abilities": "monster_special_abilities"
            }
        },
        "races": {
            "fields": {
                "name": "races_name",
                "desc": "races_desc",
                "asi_desc": "asi_desc",
                "age": "race_age",
                "alignment": "races_alignment",
                "size": "race_size",
                "speed": "race_speed",
                "vision": "race_vision",
                "traits": "race_traits"
            }
        },
        "spells": {
            "fields": {
                "name": "spells_name",
                "desc": "spells_desc",
                "higher_level": "spells_higher_level",
                "range": "spells_range",
                "spell_lists": "spells_spell_lists",
                "casting_time": "casting_time",
                "duration": "spell_duration",
                "ritual": "spell_ritual"
            }
        },
        "weapons": {
            "fields": {
                "name": "weapons_name",
                "category": "weapons_category",
                "cost": "weapons_cost",
                "damage_dice": "weapons_damage_dice",
                "damage_type": "weapons_damage_type",
                "weight": "weapons_weight",
                "properties": "weapons_properties"
            }
        }
    }
    
    if resource in rules:
        resource_rules = rules[resource]
        field_map = resource_rules.get("fields", {})
        empty_checks = resource_rules.get("empty_checks", {})
        
        filtered_item = {}
        for original_field, new_field in field_map.items():
            val = item.get(original_field)
            if val is None and original_field in empty_checks:
                val = empty_checks[original_field]
            filtered_item[new_field] = val
            
        return filtered_item
        
    return item

def lookup_by_name(resource: str, name: Union[str, List[str]], case_sensitive: bool = False) -> Union[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Look up specific entities by their name(s) within a resource.
    
    Args:
        resource: The name of the resource to search in.
        name: The name(s) of the entity to find (can be a string or list of strings).
        case_sensitive: Whether the name match should be case-sensitive.
        
    Returns:
        If name is a string, returns the entity dictionary if found, else None.
        If name is a list, returns a list of matching entity dictionaries.
    """
    data = load_resource(resource)
    is_list = isinstance(name, list)
    
    if not data:
        return [] if is_list else None
        
    target_names = name if is_list else [name]
    if not case_sensitive:
        target_names = [n.lower() for n in target_names]
        
    results = []
    for item in data:
        item_name = item.get("name", "")
        if not case_sensitive:
            item_name = item_name.lower()
            
        if item_name in target_names:
            results.append(apply_rules(resource, item))
            
    return results if is_list else (results[0] if results else None)

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
            results.append(apply_rules(resource, item))
            
    return results
