import os
import urllib.parse
from typing import Dict, List

# Knowledge-index links are rooted at docs/ and URL-encoded, e.g.
# "Tomb-of-Annihilation/Chapters/Ch-1-Port%20Nyanzaru/Arival.md". base_docs_dir
# already points inside Tomb-of-Annihilation, so this prefix is stripped.
_DOC_PREFIX = "Tomb-of-Annihilation/"

def fetch_campaign_files(paths: List[str]) -> List[Dict[str, str]]:
    """Read docs/Tomb-of-Annihilation markdown files. Returns text + provenance.

    Paths may be passed exactly as they appear as links in docs/KNOWLEDGE.md —
    URL-encoded (e.g. %20 for spaces) and optionally prefixed with
    "Tomb-of-Annihilation/". Both are normalized here so the caller never has to
    reformat an index link.
    """
    agent_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = os.path.dirname(agent_root)
    base_docs_dir = os.path.join(project_root, "docs", "Tomb-of-Annihilation")

    results = []

    for path in paths:
        # Normalize the knowledge-index link form: decode %20 etc., then drop the
        # redundant "Tomb-of-Annihilation/" prefix (base_docs_dir already has it).
        decoded = urllib.parse.unquote(path).lstrip("/")
        if decoded.startswith(_DOC_PREFIX):
            decoded = decoded[len(_DOC_PREFIX):]

        # Prevent directory traversal
        clean_path = os.path.normpath(decoded)
        if clean_path.startswith("..") or os.path.isabs(clean_path):
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
