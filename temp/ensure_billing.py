#!/usr/bin/env python3
"""
Verifica se a cobrança está ativa no projeto GCP e abre a página para ativar se necessário.
Maps/Places exigem projeto com cobrança ativa (mesmo no free tier).
"""
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATHS = [ROOT / "temp" / ".env", ROOT / ".env"]

def load_env():
    env = {}
    for p in ENV_PATHS:
        if p.is_file():
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        env[k.strip()] = v.strip().strip('"').strip("'")
            if env:
                break
    return env or dict(os.environ)

def check_billing_rest(project_id: str, token: str) -> bool:
    """Retorna True se o projeto tem conta de cobrança vinculada."""
    url = f"https://cloudbilling.googleapis.com/v1/projects/{project_id}/billingInfo"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            import json
            data = json.loads(r.read().decode())
            return bool(data.get("billingAccountName"))
    except Exception:
        return False

def main():
    os.chdir(ROOT)
    env = load_env()
    project_id = env.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project_id:
        sys.exit(1)

    token = None
    try:
        r = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=True,
        )
        token = (r.stdout or "").strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    billing_ok = False
    if token:
        billing_ok = check_billing_rest(project_id, token)

    if not billing_ok:
        import webbrowser
        webbrowser.open(f"https://console.cloud.google.com/billing/linkedaccount?project={project_id}")
        webbrowser.open(f"https://console.cloud.google.com/billing/create?project={project_id}")

if __name__ == "__main__":
    main()
