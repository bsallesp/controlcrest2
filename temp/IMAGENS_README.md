# Imagens para a landing (TV Mounting Boca Raton)

## Qualidade: o que usar

| Fonte | Qualidade | Quando usar |
|-------|-----------|-------------|
| **Adobe Firefly** | Melhor (nível profissional) | Quando sua org tiver licença – use `firefly_generate.py` |
| **Pexels (fotos reais)** | Muito boa – fotografia real | **Recomendado agora** – use `pexels_download.py` |
| **OpenAI DALL·E** | Inferior para interiores | Não recomendado para esta landing |

O Firefly entrega resultado bem superior para cenários de interiores e TV. Enquanto não tiver licença, use **fotos do Pexels** com o script abaixo.

---

## Pexels (recomendado)

Fotos reais de fotógrafos, gratuitas, com boa resolução.

1. Pegue uma API key grátis: [pexels.com/api](https://www.pexels.com/api/)
2. No `.env` da pasta `temp`, adicione:
   ```env
   PEXELS_API_KEY=sua_chave_aqui
   ```
3. Rode:
   ```bash
   cd temp
   pip install requests python-dotenv
   python pexels_download.py
   ```
4. Para baixar só as primeiras N (ex.: 10):
   ```bash
   python pexels_download.py 10
   ```

As imagens são salvas como `stock-01-living-room-tv.jpg`, etc., na pasta `temp`. Use na landing e dê crédito ao Pexels/fotógrafo conforme os termos de uso.

---

## Firefly (quando tiver licença)

Veja `FIREFLY_README.md` para credenciais e uso de `firefly_generate.py`.
