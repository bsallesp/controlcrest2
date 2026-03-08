#!/usr/bin/env python3
"""
Gera dist/index.html (com a chave do .env) e sobe um servidor local para testar.
Uso (na raiz do projeto): python LandingPage/serve.py
Abre http://localhost:8765 — o autocomplete só funciona com GOOGLE_API_KEY no temp/.env
e com a chave no GCP permitindo referrer http://localhost:8765/*
"""
import os
import sys
import http.server
import socketserver
import webbrowser
from pathlib import Path

# Garante que o build seja executado a partir da raiz do projeto
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

# Executa o build (injeta chave no dist)
import LandingPage.build as build_module
build_module.main()

DIST = ROOT / "LandingPage" / "dist"
PORT = 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))

def main():
    os.chdir(DIST)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = "http://localhost:%s/" % PORT
        print("Servidor local: %s" % url)
        print("Para o autocomplete funcionar: GOOGLE_API_KEY em temp/.env e referrer localhost liberado no GCP.")
        print("Ctrl+C para encerrar.")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        httpd.serve_forever()

if __name__ == "__main__":
    main()
