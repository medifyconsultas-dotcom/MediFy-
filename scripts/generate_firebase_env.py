#!/usr/bin/env python3
import json
import argparse
from pathlib import Path


def make_dotenv(sa_json: dict) -> str:
    """Return dotenv content for mobile backend from service account JSON."""
    project_id = sa_json.get('project_id') or sa_json.get('projectId')
    client_email = sa_json.get('client_email') or sa_json.get('clientEmail')
    private_key = sa_json.get('private_key') or sa_json.get('privateKey')

    if not (project_id and client_email and private_key):
        raise ValueError('Service account JSON is missing required fields')

    # Escape newlines for dotenv (use literal \n so that Node apps can replace \n -> newline)
    private_key_escaped = private_key.replace('\n', '\\n')

    lines = [
        f"FIREBASE_PROJECT_ID={project_id}",
        f"FIREBASE_CLIENT_EMAIL=\"{client_email}\"",
        f"FIREBASE_PRIVATE_KEY=\"{private_key_escaped}\"",
    ]

    return "\n".join(lines)


def make_railway_value(sa_json: dict) -> str:
    """Return a compact JSON string suitable for FIREBASE_SERVICE_ACCOUNT env var.

    This produces a minified JSON string (no whitespace) which Railway accepts.
    """
    return json.dumps(sa_json, separators=(',', ':'))


def main():
    p = argparse.ArgumentParser(description='Generate Firebase env values from service account JSON')
    p.add_argument('file', type=Path, help='Path to service account JSON file')
    p.add_argument('--write-dotenv', action='store_true', help='Write .env file next to the JSON for mobile backend')
    p.add_argument('--dotenv-path', type=Path, default=Path('src/mobile/backend/.env'), help='Target .env path (default: src/mobile/backend/.env)')
    args = p.parse_args()

    if not args.file.exists():
        print('Error: file not found:', args.file)
        raise SystemExit(1)

    sa = json.loads(args.file.read_text(encoding='utf-8'))

    try:
        dotenv_content = make_dotenv(sa)
        railway_value = make_railway_value(sa)
    except Exception as e:
        print('Error preparing values:', e)
        raise

    print('\n# ===== .env content for mobile backend (src/mobile/backend/.env) =====\n')
    print(dotenv_content)
    print('\n# ===== FIREBASE_SERVICE_ACCOUNT (paste exact value into Railway env var) =====\n')
    print(railway_value)

    if args.write_dotenv:
        target = args.dotenv_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(dotenv_content, encoding='utf-8')
        print(f'Wrote .env to {target.resolve()}')


if __name__ == '__main__':
    main()
