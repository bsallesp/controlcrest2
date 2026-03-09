# 403 Forbidden — Places API (New) não ativada

## Erro

- `Places API (New) has not been used in project ... before or it is disabled`
- `POST https://places.googleapis.com/.../AutocompletePlaces 403 (Forbidden)`

O componente `<gmp-place-autocomplete>` usa a **Places API (New)** (`places.googleapis.com`). Ela precisa estar **ativada** no projeto do Google Cloud.

## Solução rápida

1. **Ativar a API no Console**  
   Abra (substitua `SEU_PROJECT_ID` pelo ID do seu projeto, ex.: `176969306426`):

   **https://console.developers.google.com/apis/api/places.googleapis.com/overview?project=SEU_PROJECT_ID**

   Clique em **Ativar** (Enable).

2. **Faturamento**  
   Maps/Places exigem **conta de faturamento** vinculada ao projeto (há free tier).  
   Se ainda não tiver: [Console → Faturamento](https://console.cloud.google.com/billing) → criar conta → vincular ao projeto.

3. **Aguardar**  
   Após ativar, espere 2–5 minutos e teste de novo.

## Via script (recomendado)

No `temp/.env` defina:

- `GOOGLE_CLOUD_PROJECT=176969306426` (ou o ID do seu projeto)

Depois rode:

```bash
python temp/enable_maps_apis.py
```

O script ativa **Maps JavaScript API**, **Places API** (legacy), **Places API (New)** e **Geocoding API** (para o botão "Use my location") e pode abrir as páginas de ativação e faturamento no navegador.

## Botão "Use my location" não preenche o endereço

O botão usa **Geocoding API** (reverse geocode). Ative no projeto: [Geocoding API](https://console.developers.google.com/apis/api/geocoding-backend.googleapis.com/overview). Se a Geocoding API falhar (ex.: não ativada), a página usa **Nominatim** (OpenStreetMap) como fallback.

## Restrições da chave

Se a API key tiver restrição por referrer, inclua:

- `http://localhost:8080/*` (desenvolvimento)
- O domínio da sua landing em produção (ex.: `https://seudominio.com/*`)
