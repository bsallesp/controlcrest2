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

**Autocomplete não funciona (ApiNotActivatedMapError)?** Maps/Places exigem (1) **cobrança ativa** no projeto e (2) APIs ativadas. Rode `python temp/enable_maps_apis.py`: abre a página para vincular cobrança e a página para ativar as APIs. Se não tiver conta de cobrança, crie em Console → Faturamento; depois vincule o projeto e ative Maps JavaScript API e Places API.



Se a chave GCP tiver restrição de referrer, inclua `http://localhost:8080/*` e o domínio de produção.

---

## Exemplo (placeholders no projeto)

- **PHONE** em `temp/.env` → ex: `+15551234567`
- **YOUR_LANDING_PAGE_URL** → `https://controlcrest.com`
- **YOUR_GOOGLE_REVIEW_LINK** → `https://g.page/r/...` (copie do GBP → Compartilhar formulário de avaliação)

Depois de preencher, busque cada placeholder no projeto e substitua pelo valor correspondente.
