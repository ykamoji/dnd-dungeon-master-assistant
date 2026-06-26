import os
from typing import Dict, List

def fetch_campaign_files(paths: List[str]) -> List[Dict[str, str]]:
    """Read docs/Tomb-of-Annihilation markdown files. Returns text + provenance."""
    agent_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = os.path.dirname(agent_root)
    base_docs_dir = os.path.join(project_root, "docs", "Tomb-of-Annihilation")
    
    results = []
    
    for path in paths:
        # Prevent directory traversal
        clean_path = os.path.normpath(path)
        if clean_path.startswith("..") or clean_path.startswith("/"):
            results.append({
                "path": path,
                "error": "Invalid path: directory traversal not allowed."
            })
            continue
            
        full_path = os.path.join(base_docs_dir, clean_path)
        
        if not os.path.isfile(full_path):
            results.append({
                "path": path,
                "error": "File not found."
            })
            continue
            
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            results.append({
                "path": path,
                "content": content,
                "source": f"docs/Tomb-of-Annihilation/{clean_path}"
            })
        except Exception as e:
            results.append({
                "path": path,
                "error": str(e)
            })
            
    return results
