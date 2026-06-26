import random
import re
from typing import Dict

def roll_dice(notation: str = "", sides: int = 20, count: int = 1) -> Dict:
    """Parse dice notation ('1d20+5', '2d6', '1d100') and roll.
    
    For backward compatibility, also supports sides and count kwargs.
    """
    modifier = 0
    
    if notation:
        match = re.match(r"^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$", notation.lower().strip())
        if not match:
            raise ValueError(f"Invalid dice notation: {notation}")
            
        count_str = match.group(1)
        count = int(count_str) if count_str else 1
        sides = int(match.group(2))
        
        if match.group(3) and match.group(4):
            mod_val = int(match.group(4))
            modifier = mod_val if match.group(3) == "+" else -mod_val
            
    rolls = [random.randint(1, sides) for _ in range(count)]
    natural = sum(rolls)
    total = natural + modifier
    
    is_crit = False
    is_fumble = False
    if count == 1 and sides == 20:
        if rolls[0] == 20:
            is_crit = True
        elif rolls[0] == 1:
            is_fumble = True
            
    # For backward compatibility with the original agent.py expectation
    # The original expected `{"rolls": rolls, "total": total, "summary": "..."}`
    desc = notation if notation else f"{count}d{sides}"
    summary = f"Rolled {desc} and got {rolls}"
    if modifier != 0:
        summary += f" {'+' if modifier > 0 else '-'} {abs(modifier)}"
    summary += f" (Total: {total})"
    if is_crit:
        summary += " - CRITICAL HIT!"
    elif is_fumble:
        summary += " - CRITICAL MISS!"
            
    return {
        "notation": desc,
        "count": count,
        "sides": sides,
        "modifier": modifier,
        "rolls": rolls,
        "natural": natural,
        "total": total,
        "is_crit": is_crit,
        "is_fumble": is_fumble,
        "summary": summary
    }
