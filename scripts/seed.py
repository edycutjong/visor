#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import sys
import os

AGENT_URL = os.environ.get("AGENT_URL", "http://localhost:3000")
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "fixtures")

def register_template(template):
    url = f"{AGENT_URL}/api/template/register"
    data = json.dumps(template).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"Successfully registered template '{template['id']}': {res_data}")
            return True
    except urllib.error.URLError as e:
        print(f"Error registering template '{template['id']}' to {url}: {e}")
        return False

def main():
    templates_file = os.path.join(FIXTURES_DIR, "templates.json")
    if not os.path.exists(templates_file):
        print(f"Templates fixture not found at {templates_file}")
        sys.exit(1)
        
    with open(templates_file, "r") as f:
        templates = json.load(f)
        
    success = True
    for t in templates:
        ok = register_template(t)
        if not ok:
            success = False
            
    if success:
        print("Seeding completed successfully.")
        sys.exit(0)
    else:
        print("Seeding finished with errors (check if the coordinator agent is running on port 3000).")
        sys.exit(1)

if __name__ == "__main__":
    main()
