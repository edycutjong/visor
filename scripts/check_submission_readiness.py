#!/usr/bin/env python3
import os
import sys

print("Checking codebase for submission readiness...")

# Folders to audit
TARGET_DIRECTORIES = ["agent/src", "contract/src", "ui/src", "sdk/src", "cli/src"]
UNWANTED_KEYWORDS = ["TODO", "FIXME", "lorem", "example.com"]
IGNORED_FILES = [".next", "node_modules", "target", "wasm", "wasm-instantiated"]

issues_found = []

def audit_file(file_path):
    try:
        with open(file_path, "r", errors="ignore") as f:
            for line_no, line in enumerate(f, 1):
                for kw in UNWANTED_KEYWORDS:
                    if kw in line:
                        # Exclude some matches that are in comments explaining tests
                        if "example.com" in line and ("anonymous@example.com" in line or "example.com is a valid" in line):
                            continue
                        issues_found.append((file_path, line_no, kw, line.strip()))
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")

# Walk targets
project_root = os.path.join(os.path.dirname(__file__), "..")
for target in TARGET_DIRECTORIES:
    target_path = os.path.join(project_root, target)
    if not os.path.exists(target_path):
        continue
        
    for root, _, files in os.walk(target_path):
        # Skip ignored
        if any(ignored in root for ignored in IGNORED_FILES):
            continue
            
        for file in files:
            if file.endswith((".ts", ".tsx", ".js", ".rs", ".json", ".wit")):
                audit_file(os.path.join(root, file))

if issues_found:
    print(f"❌ Found {len(issues_found)} submission readiness issues:")
    for file, line, kw, text in issues_found:
        print(f"  - {file}:{line} (Keyword '{kw}'): {text}")
    print("\nPlease resolve these issues before submitting.")
    sys.exit(1)
else:
    print("✅ No unwanted placeholders (TODO, FIXME, lorem, example.com) found in codebase.")
    print("🎉 Codebase is submission-ready!")
    sys.exit(0)
