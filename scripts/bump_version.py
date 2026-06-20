#!/usr/bin/env python3
import sys
import os
import json

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 bump_version.py [major|minor|patch]")
        sys.exit(1)

    bump_type = sys.argv[1]
    if bump_type not in ["major", "minor", "patch"]:
        print("Error: Invalid bump type. Choose major, minor, or patch.")
        sys.exit(1)

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_pkg_path = os.path.join(root_dir, "package.json")

    # Read root package.json
    with open(root_pkg_path, "r", encoding="utf-8") as f:
        pkg = json.load(f)

    current_version = pkg.get("version", "1.0.0")
    try:
        parts = list(map(int, current_version.split(".")))
    except ValueError:
        print(f"Error: Current version '{current_version}' in root package.json is invalid.")
        sys.exit(1)

    if len(parts) != 3:
        print(f"Error: Current version '{current_version}' is not in x.y.z format.")
        sys.exit(1)

    if bump_type == "major":
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    elif bump_type == "minor":
        parts[1] += 1
        parts[2] = 0
    elif bump_type == "patch":
        parts[2] += 1

    new_version = f"{parts[0]}.{parts[1]}.{parts[2]}"
    print(f"Bumping version from {current_version} to {new_version}...")

    # Update NPM packages
    npm_dirs = [".", "sdk", "agent", "cli", "ui"]
    for d in npm_dirs:
        dir_path = os.path.join(root_dir, d)
        pkg_path = os.path.join(dir_path, "package.json")
        if os.path.exists(pkg_path):
            with open(pkg_path, "r", encoding="utf-8") as f:
                p_data = json.load(f)
            p_data["version"] = new_version
            with open(pkg_path, "w", encoding="utf-8") as f:
                json.dump(p_data, f, indent=2)
                f.write("\n")
            
            # also update package-lock.json if it exists
            lock_path = os.path.join(dir_path, "package-lock.json")
            if os.path.exists(lock_path):
                with open(lock_path, "r", encoding="utf-8") as f:
                    l_data = json.load(f)
                l_data["version"] = new_version
                if "packages" in l_data and "" in l_data["packages"]:
                    l_data["packages"][""]["version"] = new_version
                with open(lock_path, "w", encoding="utf-8") as f:
                    json.dump(l_data, f, indent=2)
                    f.write("\n")
            print(f"  - Updated package.json in {d}")

    # Update Cargo.toml version
    cargo_path = os.path.join(root_dir, "contract/Cargo.toml")
    if os.path.exists(cargo_path):
        with open(cargo_path, "r", encoding="utf-8") as f:
            cargo_lines = f.readlines()
        
        updated = False
        for i, line in enumerate(cargo_lines):
            if line.strip().startswith("version ="):
                cargo_lines[i] = f'version = "{new_version}"\n'
                updated = True
                break
                
        if updated:
            with open(cargo_path, "w", encoding="utf-8") as f:
                f.writelines(cargo_lines)
            print("  - Updated contract/Cargo.toml")
        else:
            print("  - Warning: 'version =' not found in contract/Cargo.toml")

    print(f"Successfully bumped monorepo version to {new_version}!")

if __name__ == "__main__":
    main()
