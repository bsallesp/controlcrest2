#!/usr/bin/env python3
"""
Ativa Maps JavaScript API e Places API no projeto GCP via API (gcloud ou REST).
Uso: defina GOOGLE_CLOUD_PROJECT no .env e rode: python temp/enable_maps_apis.py
Requer: gcloud instalado e logado (gcloud auth application-default login) OU
        token de acesso com permissão Service Usage Admin no projeto.
"""
import os
import subprocess
import sys
from pathlib import Path

# Projeto e .env
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

# Serviços necessários para o autocomplete (nomes no Service Usage API)
# PlaceAutocompleteElement (gmp-place-autocomplete) usa Places API (New) = places.googleapis.com
SERVICES = [
    "maps-backend.googleapis.com",   # Maps JavaScript API
    "places-backend.googleapis.com",  # Places API (legacy)
    "places.googleapis.com",         # Places API (New)
    "geocoding-backend.googleapis.com",  # Geocoding API — botão "Use my location" (reverse geocode)
]

def enable_via_gcloud(project_id: str) -> bool:
    """Usa gcloud services enable (requer gcloud instalado e autenticado)."""
    for svc in SERVICES:
        try:
            subprocess.run(
                ["gcloud", "services", "enable", svc, f"--project={project_id}"],
                check=True,
                capture_output=True,
                text=True,
            )
            print(f"OK: {svc}")
        except FileNotFoundError:
            return False
        except subprocess.CalledProcessError as e:
            print(f"Erro ao ativar {svc}: {e.stderr or e}")
            return False
    return True

def enable_via_rest(project_id: str, token: str) -> bool:
    """Ativa via REST (Service Usage API) com token de acesso."""
    try:
        import urllib.request
        import json
    except ImportError:
        return False

    for svc in SERVICES:
        url = f"https://serviceusage.googleapis.com/v1/projects/{project_id}/services/{svc}:enable"
        req = urllib.request.Request(url, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, data=b"{}") as r:
                print(f"OK: {svc}")
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            print(f"Erro ao ativar {svc}: {e.code} {body}")
            return False
    return True

def main():
    os.chdir(ROOT)
    env = load_env()
    project_id = env.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project_id:
        print("Defina GOOGLE_CLOUD_PROJECT no temp/.env (ID do projeto no GCP).")
        sys.exit(1)

    # 1) Tentar gcloud
    if enable_via_gcloud(project_id):
        print("APIs ativadas (gcloud).")
        return

    # 2) Obter token do gcloud e usar REST
    try:
        r = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=True,
        )
        token = (r.stdout or "").strip()
        if token and enable_via_rest(project_id, token):
            print("APIs ativadas (REST).")
            return
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    # 3) Abrir Console: ativação das APIs + faturamento (Maps exige billing no projeto)
    import webbrowser
    base_flow = "https://console.cloud.google.com/flows/enableapi?apiid"
    webbrowser.open(f"{base_flow}=maps-backend.googleapis.com&project={project_id}")
    webbrowser.open(f"{base_flow}=places-backend.googleapis.com&project={project_id}")
    webbrowser.open(f"{base_flow}=places.googleapis.com&project={project_id}")
    webbrowser.open(f"{base_flow}=geocoding-backend.googleapis.com&project={project_id}")  # botão Use my location
    webbrowser.open(f"https://console.cloud.google.com/billing/linkedaccount?project={project_id}")

if __name__ == "__main__":
    main()
