#!/usr/bin/env python3
"""
Injeta a chave GCP (chave mestra) do .env no index.html e gera LandingPage/dist/index.html.
Uso (na raiz do projeto): python LandingPage/build.py
Requer GOOGLE_API_KEY em temp/.env (ou .env na raiz).
"""
import os
import re

def load_env(path):
    env = {}
    if not os.path.isfile(path):
        return env
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for env_path in [os.path.join(root, "temp", ".env"), os.path.join(root, ".env")]:
        env = load_env(env_path)
        if env:
            break
    else:
        env = dict(os.environ)

    api_key = env.get("GOOGLE_API_KEY") or env.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("AVISO: GOOGLE_API_KEY (ou GOOGLE_PLACES_API_KEY) não encontrada em temp/.env ou .env.")
        print("O dist/index.html será gerado com o placeholder; o autocomplete não funcionará até definir a chave.")
        api_key = "YOUR_GOOGLE_PLACES_API_KEY"

    phone = (env.get("PHONE") or env.get("YOUR_PHONE") or "").strip()
    if not phone:
        phone = "YOUR_PHONE"

    index_path = os.path.join(root, "LandingPage", "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    html = html.replace("YOUR_GOOGLE_PLACES_API_KEY", api_key, 1)
    html = html.replace("YOUR_PHONE", phone)

    dist_dir = os.path.join(root, "LandingPage", "dist")
    os.makedirs(dist_dir, exist_ok=True)
    out_path = os.path.join(dist_dir, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print("Gerado:", out_path)

if __name__ == "__main__":
    main()
