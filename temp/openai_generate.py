"""
Gera imagens para a landing (TV Mounting / Boca Raton) via OpenAI DALL·E API.
Usa OPENAI_API_KEY do .env na pasta temp.
"""
import os
import sys
import base64
from pathlib import Path

try:
    from openai import OpenAI
    from dotenv import load_dotenv
    import requests
except ImportError:
    print("Instale: pip install openai python-dotenv requests")
    sys.exit(1)

# Carrega .env da pasta temp
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

# Sufixo para elevar qualidade: fotografia editorial, iluminação natural, visual premium
STYLE_SUFFIX = ". Professional interior photography, magazine quality, soft natural lighting, refined aesthetic, photorealistic, high-end residential, 8k detail."

# Prompts da landing com direção de estilo premium
PROMPTS_LANDING = [
    {"filename": "openai-01.png", "prompt": "Luxury living room with wall-mounted 85 inch TV, hidden wires, modern Boca Raton home, warm wood and neutral tones"},
    {"filename": "openai-02.png", "prompt": "Professional technician in uniform installing large flat-screen TV on wall, clean modern interior, focused and competent"},
    {"filename": "openai-03.png", "prompt": "High-end living room, TV mounted above elegant stone fireplace, sophisticated furniture, ambient lighting"},
    {"filename": "openai-04.png", "prompt": "Modern minimalist living room, floating TV and slim soundbar, Scandinavian-inspired, lots of natural light"},
    {"filename": "openai-05.png", "prompt": "Luxury Florida home theater, mounted large television, dark accent wall, comfortable seating"},
    {"filename": "openai-06.png", "prompt": "Skilled technician mounting 75 inch TV with power drill, modern living room, professional and tidy"},
    {"filename": "openai-07.png", "prompt": "Hidden cable TV installation, pristine white wall, no visible wires, minimalist and clean"},
    {"filename": "openai-08.png", "prompt": "Large flat-screen TV in luxury condo living room, floor-to-ceiling windows, upscale decor"},
    {"filename": "openai-09.png", "prompt": "Boca Raton luxury home living room, mounted TV with soundbar, coastal elegant style"},
    {"filename": "openai-10.png", "prompt": "Modern TV installation above marble fireplace, contemporary furniture, cohesive design"},
    {"filename": "openai-11.png", "prompt": "Elegant interior, wall-mounted television with subtle LED bias lighting, warm and inviting"},
    {"filename": "openai-12.png", "prompt": "Professional installer holding TV wall mount bracket, clean workspace, residential setting"},
    {"filename": "openai-13.png", "prompt": "Before and after TV wall mounting, same room comparison, dramatic improvement, tidy result"},
    {"filename": "openai-14.png", "prompt": "Clean cable management, TV on wall with all wires concealed, sleek and organized"},
    {"filename": "openai-15.png", "prompt": "Minimalist white living room, floating TV, plants and soft textiles, serene atmosphere"},
    {"filename": "openai-16.png", "prompt": "Large OLED TV on wall in luxury house, dark frame, premium entertainment setup"},
    {"filename": "openai-17.png", "prompt": "Technician installing soundbar under wall-mounted TV, living room, careful installation"},
    {"filename": "openai-18.png", "prompt": "Premium living room TV mounting, finished result, designer furniture, polished look"},
    {"filename": "openai-19.png", "prompt": "Modern penthouse living room, TV wall installation, city view through windows"},
    {"filename": "openai-20.png", "prompt": "Close-up of hands installing TV wall mount bracket, quality hardware, precise work"},
    {"filename": "openai-21.png", "prompt": "Stylish condo interior with mounted television, mid-century modern accents, curated decor"},
    {"filename": "openai-22.png", "prompt": "TV mounted on stone fireplace wall, rustic elegance, cozy living room"},
    {"filename": "openai-23.png", "prompt": "Professional home theater installation, large screen, tiered seating, dedicated room"},
    {"filename": "openai-24.png", "prompt": "Modern Florida house, large wall-mounted TV in bright living area, palm view"},
    {"filename": "openai-25.png", "prompt": "Technician measuring wall for TV mount, clipboard, prepared and methodical"},
    {"filename": "openai-26.png", "prompt": "Elegant living room with hidden cable TV setup, no clutter, designer aesthetic"},
    {"filename": "openai-27.png", "prompt": "Large TV with soundbar and low media console, balanced composition, living room"},
    {"filename": "openai-28.png", "prompt": "Contemporary home interior, TV wall installation, neutral palette, architectural interest"},
    {"filename": "openai-29.png", "prompt": "Technician drilling wall for TV mount, dust protection, professional equipment"},
    {"filename": "openai-30.png", "prompt": "Luxury living room with 85 inch mounted TV as centerpiece, symmetrical layout"},
    {"filename": "openai-31.png", "prompt": "Modern apartment TV mounting, compact living room, smart use of space"},
    {"filename": "openai-32.png", "prompt": "Clean drywall with concealed wiring, TV installation, seamless finish"},
    {"filename": "openai-33.png", "prompt": "Installer adjusting large TV mount on wall, leveling, attention to detail"},
    {"filename": "openai-34.png", "prompt": "Premium Boca Raton style living room TV setup, gold and navy accents, upscale"},
    {"filename": "openai-35.png", "prompt": "Home entertainment wall, mounted TV and soundbar, organized and inviting"},
]


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit(
            "Defina OPENAI_API_KEY no arquivo .env na pasta temp ou nas variáveis de ambiente."
        )

    client = OpenAI(api_key=api_key)
    prompts_to_run = PROMPTS_LANDING

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg.isdigit():
            n = int(arg)
            prompts_to_run = prompts_to_run[:n]
            print(f"Gerando as primeiras {n} imagens.\n")
        else:
            custom = " ".join(sys.argv[1:])
            prompts_to_run = [{"filename": "openai-custom.png", "prompt": custom}]
            print("Gerando 1 imagem (prompt customizado).\n")
    else:
        print(f"Gerando {len(prompts_to_run)} imagens para a landing.\n")

    for i, item in enumerate(prompts_to_run, 1):
        name = item["filename"]
        prompt = item["prompt"]
        out_path = TEMP_DIR / name
        print(f"[{i}/{len(prompts_to_run)}] {name}")
        print(f"    {prompt[:55]}...")
        try:
            full_prompt = prompt + STYLE_SUFFIX
            resp = client.images.generate(
                model="dall-e-3",
                prompt=full_prompt,
                size="1792x1024",
                quality="hd",
                style="natural",
                n=1,
                response_format="url",
            )
            url = resp.data[0].url
            r = requests.get(url, stream=True)
            r.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"    Salvo: {out_path}")
        except Exception as e:
            print(f"    Erro: {e}")
        print()

    print("Concluído. Imagens em:", TEMP_DIR)


if __name__ == "__main__":
    main()
