"""
Baixa fotos REAIS de alta qualidade do Pexels para a landing (TV mounting / Boca Raton).
Resultado muito mais profissional que IA gerativa – use este enquanto não tiver licença Firefly.
Requer PEXELS_API_KEY no .env (grátis: https://www.pexels.com/api/).
"""
import os
import sys
import time
from pathlib import Path

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Instale: pip install requests python-dotenv")
    sys.exit(1)

TEMP_DIR = Path(__file__).resolve().parent
_env_path = TEMP_DIR / ".env"
if _env_path.exists():
    try:
        load_dotenv(_env_path, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            load_dotenv(_env_path, encoding="utf-16")
        except Exception:
            pass

# Buscas no Pexels – fotografia real, interiores e TV
SEARCHES = [
    ("stock-01-living-room-tv.jpg", "luxury living room wall mounted TV"),
    ("stock-02-modern-living-room-tv.jpg", "modern living room flat screen TV"),
    ("stock-03-tv-above-fireplace.jpg", "TV above fireplace living room"),
    ("stock-04-minimalist-tv-room.jpg", "minimalist living room TV"),
    ("stock-05-home-theater.jpg", "home theater mounted TV"),
    ("stock-06-living-room-entertainment.jpg", "living room entertainment wall TV"),
    ("stock-07-clean-wall-tv.jpg", "clean wall mounted television"),
    ("stock-08-luxury-condo-tv.jpg", "luxury condo living room TV"),
    ("stock-09-coastal-living-room.jpg", "coastal living room TV"),
    ("stock-10-marble-fireplace-tv.jpg", "marble fireplace TV modern"),
    ("stock-11-elegant-living-room.jpg", "elegant living room television"),
    ("stock-12-professional-installer.jpg", "technician installing TV"),
    ("stock-13-modern-apartment-tv.jpg", "modern apartment living room TV"),
    ("stock-14-cable-management.jpg", "clean cable management wall"),
    ("stock-15-white-living-room-tv.jpg", "white living room TV minimalist"),
    ("stock-16-large-tv-wall.jpg", "large TV wall mounted living room"),
    ("stock-17-soundbar-tv.jpg", "TV soundbar living room"),
    ("stock-18-premium-living-room.jpg", "premium living room TV"),
    ("stock-19-penthouse-tv.jpg", "penthouse living room TV"),
    ("stock-20-condo-tv-interior.jpg", "condo interior mounted TV"),
    ("stock-21-stone-fireplace-tv.jpg", "stone fireplace TV"),
    ("stock-22-home-cinema.jpg", "home cinema TV room"),
    ("stock-23-florida-living-room.jpg", "Florida living room bright"),
    ("stock-24-contemporary-tv-wall.jpg", "contemporary TV wall interior"),
    ("stock-25-luxury-tv-setup.jpg", "luxury TV setup living room"),
]


def main():
    api_key = os.environ.get("PEXELS_API_KEY")
    if not api_key:
        raise SystemExit(
            "Defina PEXELS_API_KEY no .env (grátis em https://www.pexels.com/api/)."
        )

    headers = {"Authorization": api_key}
    session = requests.Session()
    session.headers.update(headers)

    n = None
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        n = int(sys.argv[1])
        searches = SEARCHES[:n]
        print(f"Baixando as primeiras {n} fotos.\n")
    else:
        searches = SEARCHES
        print(f"Baixando {len(searches)} fotos do Pexels.\n")

    for i, (filename, query) in enumerate(searches, 1):
        out_path = TEMP_DIR / filename
        print(f"[{i}/{len(searches)}] {filename}")
        print(f"    Busca: {query}")
        try:
            r = session.get(
                "https://api.pexels.com/v1/search",
                params={"query": query, "per_page": 1, "orientation": "landscape"},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            if not data.get("photos"):
                print("    Nenhuma foto encontrada.")
                continue
            photo = data["photos"][0]
            # Usar 'large' ou 'original' para boa resolução
            url = photo.get("src", {}).get("original") or photo.get("src", {}).get("large")
            if not url:
                print("    URL não disponível.")
                continue
            img = session.get(url, timeout=30)
            img.raise_for_status()
            with open(out_path, "wb") as f:
                f.write(img.content)
            print(f"    Salvo: {out_path}")
            # Respeitar rate limit (200/h)
            time.sleep(0.5)
        except Exception as e:
            print(f"    Erro: {e}")
        print()

    print("Concluído. Fotos em:", TEMP_DIR)


if __name__ == "__main__":
    main()
