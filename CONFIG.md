# Configuração — preencha uma vez e use Find & Replace

Substitua os valores abaixo pelos seus dados reais. Depois use **Find & Replace** no projeto (ou em cada arquivo indicado) para trocar o placeholder pelo valor.

| Placeholder | Seu valor | Onde substituir |
|-------------|-----------|------------------|
| **PHONE** | Número no formato `+15551234567` | `temp/.env` (o build injeta na landing; use Find & Replace em `PaidTraffic/ad-copy.md` se precisar) |
| **YOUR_LANDING_PAGE_URL** | URL da sua página, ex: `https://seusite.com` | `PaidTraffic/ad-copy.md` |
| **YOUR_GOOGLE_REVIEW_LINK** | Link do formulário de avaliação do seu Google Business | `GoogleBusiness/review-script.md` |
---

## Landing: tudo em `temp/.env`

Defina **GOOGLE_API_KEY** e **PHONE** em `temp/.env`. O build (rodado pelo `serve.py`) injeta no `dist/index.html`. Deploy = pasta `LandingPage/dist/`.

**Autocomplete não funciona (403 / Places API (New) has not been used or is disabled)?** O campo de endereço usa **Places API (New)** (`places.googleapis.com`). É preciso: (1) **cobrança ativa** no projeto e (2) **Places API (New)** ativada. Rode `python temp/enable_maps_apis.py` (define `GOOGLE_CLOUD_PROJECT` no `temp/.env` com o ID do projeto, ex.: `176969306426`) — o script ativa Maps, Places (legacy) e **Places API (New)**. Ou ative manualmente: [Places API (New)](https://console.developers.google.com/apis/api/places.googleapis.com/overview) → selecione o projeto → Ativar. Após ativar, espere alguns minutos antes de testar de novo.



Se a chave GCP tiver restrição de referrer, inclua `http://localhost:8080/*` e o domínio de produção.

---

## Exemplo (placeholders no projeto)

- **PHONE** em `temp/.env` → ex: `+15551234567`
- **YOUR_LANDING_PAGE_URL** → `https://controlcrest.com`
- **YOUR_GOOGLE_REVIEW_LINK** → `https://g.page/r/...` (copie do GBP → Compartilhar formulário de avaliação)

Depois de preencher, busque cada placeholder no projeto e substitua pelo valor correspondente.
