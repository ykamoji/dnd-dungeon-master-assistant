import asyncio
import os

import httpx

from app.db import get_client, close_client, check_health
from app.tools import TOOL_FUNCTIONS

async def run_tests():
    print("=== Phase 1: Direct Function Calls ===")
    
    # 1. DB Health
    print("Testing DB Health...")
    db_ok = False
    try:
        res = check_health()
        print(f"DB Health: {res}")
        if res.get("status") == "ok":
            db_ok = True
    except Exception as e:
        print(f"DB Health error: {e}")
        
    # 2. Roll Dice
    print("\nTesting roll_dice...")
    try:
        roll = TOOL_FUNCTIONS["roll_dice"](notation="2d6+3")
        print(f"Roll result: {roll['total']} (from {roll['notation']})")
    except Exception as e:
        print(f"Roll error: {e}")
        
    # 3. Lookup Character
    print("\nTesting lookup_character...")
    try:
        char = TOOL_FUNCTIONS["lookup_character"]("Acererak")
        if char:
            print(f"Found {char['Name']}, AC: {char['AC']}, HP: {char['HP']}")
        else:
            print("Acererak not found in Appendix D.")
    except Exception as e:
        print(f"Lookup Character error: {e}")
        
    # 4. Open5e Lookups
    print("\nTesting Open5e lookups...")
    try:
        spell = TOOL_FUNCTIONS["lookup_spell"]("Fireball")
        if spell:
            print(f"Found spell: {spell.get('name')}")
        else:
            print("Fireball not found.")
    except Exception as e:
        print(f"Open5e error: {e}")
        
    # 5. Asset URL
    print("\nTesting get_asset_url...")
    try:
        asset = TOOL_FUNCTIONS["get_asset_url"]("Port Nyanzaru")
        if "url" in asset:
            print(f"Found asset: {asset['url']}")
        else:
            print("Asset not found.")
    except Exception as e:
        print(f"Asset lookup error: {e}")
        
    # DB dependent tests
    if db_ok:
        print("\nTesting state updates (DB dependent)...")
        try:
            cid = "smoke_test_campaign_001"
            # Update state
            res = TOOL_FUNCTIONS["update_state"](
                campaign_id=cid,
                scene="Smoke Test Scene",
                description="Testing the API.",
                metadata={"chapter": "test", "asset_urls": []},
                initiative=["Tester"],
                party={"characters": {"Tester": {"hp": 10, "max_hp": 10, "conditions": []}}},
                progress=5.0
            )
            print(f"Update state: {res['scene']}")
            
            # Get state
            state = TOOL_FUNCTIONS["get_party_state"](cid)
            print(f"Get state: {state['scene']}")
            
            # Save summary
            TOOL_FUNCTIONS["save_summary"](cid, "Smoke test summary")
            
            # Get summary
            summary = TOOL_FUNCTIONS["get_summary"](cid)
            print(f"Get summary: {summary['summary']}")
            
        except Exception as e:
            print(f"State test error: {e}")
    else:
        print("\nSkipping state updates because MongoDB is not reachable.")
        
    print("\n=== Phase 2: HTTP Route Calls ===")
    from app.fast_api_app import app
    
    # We use ASGI transport to hit the FastAPI app without running a server
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # DB Health
        res = await client.get("/health/db")
        print(f"GET /health/db: {res.status_code}")
        
        # Roll Dice
        res = await client.post("/tools/roll_dice", json={"notation": "1d20+5"})
        print(f"POST /tools/roll_dice: {res.status_code}")
        if res.status_code == 200:
            print(f"  Result: {res.json()['total']}")
            
        # Lookup Character
        res = await client.get("/tools/lookup_character/Acererak")
        print(f"GET /tools/lookup_character/Acererak: {res.status_code}")
        
    print("\nSmoke tests completed.")
    close_client()

if __name__ == "__main__":
    asyncio.run(run_tests())
