#!/usr/bin/env python3
"""Copy the approved travel template into a new, isolated project."""
import argparse
import json
import shutil
import uuid
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--demo", action="store_true", help="Include the fictional 13-day Switzerland/Italy trip")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = args.output.expanduser().resolve()
    if output.exists():
        parser.error("Output already exists; choose a new directory to preserve existing work.")
    if output == root or root in output.parents:
        parser.error("Choose an output directory outside the installed skill.")
    shutil.copytree(root / "assets/template", output)
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        shutil.copy2(root / name, output / name)
    data_path = root / "examples/switzerland-italy-13days.json" if args.demo else output / "trip-data.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    data["metadata"]["tripId"] = "travel-" + uuid.uuid4().hex[:12]
    (output / "trip-data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created travel project: {output}")
    print("Next: edit trip-data.json, then npm run build:map, npm run validate, npm run preview.")


if __name__ == "__main__":
    main()
