"""
Script to fetch data from the Open5e API.

This script fetches data for spells, monsters, weapons, magicitems, races,
backgrounds, armor, and classes from the Open5e API (https://api.open5e.com)
and saves them as JSON files in the data/open5e/ directory.

It is idempotent and offline-friendly; it will skip fetching if the files
already exist unless the --refresh flag is provided.
"""

import argparse
import json
import logging
import os
import requests
from typing import Any, Dict, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://api.open5e.com/v1"
RESOURCES = [
    "spells",
    "monsters",
    "weapons",
    "magicitems",
    "races",
    "backgrounds",
    "armor",
    "classes",
]


def fetch_paginated_resource(resource: str) -> List[Dict[str, Any]]:
    """Fetch all pages of a given resource from the Open5e API."""
    url = f"{BASE_URL}/{resource}/"
    results: List[Dict[str, Any]] = []

    logger.info(f"Fetching {resource} from {url}...")
    while url:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Open5e standard pagination response format
            if "results" in data:
                results.extend(data["results"])
                url = data.get("next")
            else:
                # In case a resource returns a flat list or different structure
                logger.warning(f"Unexpected response format for {resource}, attempting to parse as flat list.")
                if isinstance(data, list):
                    results.extend(data)
                url = None
                
            if url:
                logger.info(f"Fetching next page for {resource}...")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {resource} from {url}: {e}")
            break

    logger.info(f"Successfully fetched {len(results)} items for {resource}.")
    return results


def main() -> None:
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Fetch D&D data from Open5e API.")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Force re-fetch of data even if files already exist.",
    )
    args = parser.parse_args()

    # Determine paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "open5e")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    for resource in RESOURCES:
        output_file = os.path.join(output_dir, f"{resource}.json")
        
        # Check idempotency
        if os.path.exists(output_file) and not args.refresh:
            logger.info(f"File {output_file} already exists. Skipping {resource}. Use --refresh to override.")
            continue
            
        # Fetch and save data
        data = fetch_paginated_resource(resource)
        if data:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {resource} to {output_file}")
        else:
            logger.warning(f"No data fetched for {resource}. File not created.")

if __name__ == "__main__":
    main()
