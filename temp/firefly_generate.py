"""
Script para gerar imagens via Adobe Firefly API e salvar na pasta temp.
Complementa as referências em EFEITOS_REFERENCIAS.md com imagens para a landing (hero, serviços, galeria).
"""
import os
import sys
import time
import json
from pathlib import Path

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Instale as dependências: pip install -r requirements-firefly.txt")
    sys.exit(1)

# Carrega apenas .env da pasta temp (evita .env em UTF-16 de outras pastas)
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    try:
        load_dotenv(_env_path, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            load_dotenv(_env_path, encoding="utf-16")
        except Exception:
            pass
# Se não existir .env em temp, use variáveis de ambiente do sistema

BASE = "https://firefly-api.adobe.io"
TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3"
SCOPE = "openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis"

# Pasta onde salvar as imagens (temp do projeto)
TEMP_DIR = Path(__file__).resolve().parent


def get_access_token():
    """Obtém access token OAuth com client credentials."""
    client_id = os.environ.get("FIREFLY_SERVICES_CLIENT_ID")
    client_secret = os.environ.get("FIREFLY_SERVICES_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise SystemExit(
            "Defina FIREFLY_SERVICES_CLIENT_ID e FIREFLY_SERVICES_CLIENT_SECRET "
            "(arquivo .env na pasta temp ou variáveis de ambiente). Veja FIREFLY_README.md."
        )
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": SCOPE,
    }
    r = requests.post(TOKEN_URL, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
    r.raise_for_status()
    return r.json()["access_token"], client_id


def generate_image_async(access_token, client_id, prompt, content_class="photo", **kwargs):
    """
    Dispara geração de imagem (API assíncrona).
    Retorna dict com jobId, statusUrl, cancelUrl.
    """
    body = {"prompt": prompt, "contentClass": content_class, **kwargs}
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": client_id,
        "Authorization": f"Bearer {access_token}",
    }
    r = requests.post(f"{BASE}/v3/images/generate-async", headers=headers, json=body)
    r.raise_for_status()
    return r.json()


def poll_job(status_url, client_id, access_token, poll_interval=1.5, max_wait=120):
    """
    Poll statusUrl até o job concluir (succeeded ou failed).
    Retorna o payload completo em caso de sucesso.
    """
    start = time.time()
    while time.time() - start < max_wait:
        r = requests.get(status_url, headers={"x-api-key": client_id, "Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        data = r.json()
        status = data.get("status", "")
        if status == "succeeded":
            return data
        if status == "failed":
            raise RuntimeError(f"Firefly job failed: {data}")
        time.sleep(poll_interval)
    raise TimeoutError("Firefly job did not complete in time.")


def download_image(url, filepath):
    """Baixa a imagem da URL pré-assinada e salva em filepath."""
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(filepath, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)


def list_existing_images():
    """Lista imagens já presentes na pasta temp (para complementar)."""
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    return [f.name for f in TEMP_DIR.iterdir() if f.is_file() and f.suffix.lower() in exts]


# Prompts para a landing (TV Mounting / Boca Raton – Adobe Firefly)
PROMPTS_LANDING = [
    {"filename": "firefly-01.jpg", "prompt": "Luxury living room with wall-mounted 85 inch TV, hidden wires, modern Boca Raton home", "content_class": "photo"},
    {"filename": "firefly-02.jpg", "prompt": "Professional technician installing large TV on wall, clean modern interior", "content_class": "photo"},
    {"filename": "firefly-03.jpg", "prompt": "High-end living room TV mounted above fireplace, elegant house", "content_class": "photo"},
    {"filename": "firefly-04.jpg", "prompt": "Modern minimalist living room with floating TV and soundbar", "content_class": "photo"},
    {"filename": "firefly-05.jpg", "prompt": "Luxury Florida home theater with mounted television", "content_class": "photo"},
    {"filename": "firefly-06.jpg", "prompt": "Technician mounting 75 inch TV with power drill, professional setup", "content_class": "photo"},
    {"filename": "firefly-07.jpg", "prompt": "Hidden cable TV installation, clean wall finish", "content_class": "photo"},
    {"filename": "firefly-08.jpg", "prompt": "Large flat-screen TV mounted in luxury condo living room", "content_class": "photo"},
    {"filename": "firefly-09.jpg", "prompt": "Boca Raton luxury home living room with mounted TV and soundbar", "content_class": "photo"},
    {"filename": "firefly-10.jpg", "prompt": "Modern TV installation above marble fireplace", "content_class": "photo"},
    {"filename": "firefly-11.jpg", "prompt": "Elegant interior with wall-mounted television and LED lighting", "content_class": "photo"},
    {"filename": "firefly-12.jpg", "prompt": "Professional installer holding large TV mount bracket", "content_class": "photo"},
    {"filename": "firefly-13.jpg", "prompt": "Before and after TV wall mounting transformation", "content_class": "photo"},
    {"filename": "firefly-14.jpg", "prompt": "Clean cable management TV installation", "content_class": "photo"},
    {"filename": "firefly-15.jpg", "prompt": "Minimalist white living room with floating TV", "content_class": "photo"},
    {"filename": "firefly-16.jpg", "prompt": "Large OLED TV mounted on wall in luxury house", "content_class": "photo"},
    {"filename": "firefly-17.jpg", "prompt": "Technician installing soundbar under TV", "content_class": "photo"},
    {"filename": "firefly-18.jpg", "prompt": "Premium living room TV mounting service scene", "content_class": "photo"},
    {"filename": "firefly-19.jpg", "prompt": "Modern penthouse living room TV wall installation", "content_class": "photo"},
    {"filename": "firefly-20.jpg", "prompt": "Close-up installing TV wall mount bracket", "content_class": "photo"},
    {"filename": "firefly-21.jpg", "prompt": "Stylish condo interior with mounted television", "content_class": "photo"},
    {"filename": "firefly-22.jpg", "prompt": "TV mounted on stone fireplace wall", "content_class": "photo"},
    {"filename": "firefly-23.jpg", "prompt": "Professional home theater installation scene", "content_class": "photo"},
    {"filename": "firefly-24.jpg", "prompt": "Modern Florida house with large wall-mounted TV", "content_class": "photo"},
    {"filename": "firefly-25.jpg", "prompt": "Technician measuring wall for TV mount", "content_class": "photo"},
    {"filename": "firefly-26.jpg", "prompt": "Elegant living room with hidden cable TV setup", "content_class": "photo"},
    {"filename": "firefly-27.jpg", "prompt": "Large TV installation with soundbar and console", "content_class": "photo"},
    {"filename": "firefly-28.jpg", "prompt": "Contemporary home interior TV wall installation", "content_class": "photo"},
    {"filename": "firefly-29.jpg", "prompt": "Technician drilling wall for TV mount", "content_class": "photo"},
    {"filename": "firefly-30.jpg", "prompt": "Luxury living room with 85 inch mounted TV centerpiece", "content_class": "photo"},
    {"filename": "firefly-31.jpg", "prompt": "Modern apartment TV mounting installation scene", "content_class": "photo"},
    {"filename": "firefly-32.jpg", "prompt": "Clean drywall concealed wiring TV installation", "content_class": "photo"},
    {"filename": "firefly-33.jpg", "prompt": "Installer adjusting large TV mount on wall", "content_class": "photo"},
    {"filename": "firefly-34.jpg", "prompt": "Premium Boca Raton style living room TV setup", "content_class": "photo"},
    {"filename": "firefly-35.jpg", "prompt": "Home entertainment wall with mounted TV and soundbar", "content_class": "photo"},
]


def main():
    print("Firefly: obtendo token...")
    access_token, client_id = get_access_token()
    print("Token obtido.\n")

    existing = list_existing_images()
    if existing:
        print(f"Imagens já em temp: {existing}\n")

    prompts_to_run = PROMPTS_LANDING
    if len(sys.argv) > 1:
        # Uso: python firefly_generate.py "sua descrição aqui"
        custom_prompt = " ".join(sys.argv[1:])
        prompts_to_run = [
            {"filename": "firefly-custom.jpg", "prompt": custom_prompt, "content_class": "photo"}
        ]
        print(f"Gerando 1 imagem com prompt customizado.\n")
    else:
        print(f"Gerando {len(prompts_to_run)} imagens para a landing.\n")

    for i, item in enumerate(prompts_to_run, 1):
        name = item["filename"]
        prompt = item["prompt"]
        content_class = item.get("content_class", "photo")
        out_path = TEMP_DIR / name

        print(f"[{i}/{len(prompts_to_run)}] {name}")
        print(f"    Prompt: {prompt[:60]}...")
        try:
            job = generate_image_async(access_token, client_id, prompt, content_class=content_class)
            status_url = job.get("statusUrl")
            if not status_url:
                print("    Resposta inesperada (sem statusUrl).", job)
                continue
            result = poll_job(status_url, client_id, access_token)
            url = result["result"]["outputs"][0]["image"]["url"]
            download_image(url, out_path)
            print(f"    Salvo: {out_path}")
        except Exception as e:
            print(f"    Erro: {e}")
        print()

    print("Concluído. Imagens em:", TEMP_DIR)
    print("Existentes agora:", list_existing_images())


if __name__ == "__main__":
    main()
