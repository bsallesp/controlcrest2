# ControlCrest — tráfego pago e Google Business

Este repositório reúne **criação e manutenção** de:

1. **Tráfego pago** — campanhas Google Ads (Search), copy, orçamento e checklist operacional.  
2. **Google Business Profile (GBP)** — estratégia local (3-Pack), reviews, fotos, posts, Q&A e API Python opcional.

A **landing page** (`LandingPage/`) é o destino comum dos anúncios e do perfil; placeholders globais estão em [`CONFIG.md`](./CONFIG.md) e em `temp/.env`.

---

## Mapa do projeto

| Pasta | Função |
|-------|--------|
| [`PaidTraffic/`](./PaidTraffic/) | Estratégia Google Ads, keywords, copy, **manutenção** pós-lançamento |
| [`GoogleBusiness/`](./GoogleBusiness/) | Estratégia GBP, scripts de review, templates de post, API |
| [`LandingPage/`](./LandingPage/) | Site que recebe cliques de ads e GBP |
| [`temp/`](./temp/) | `.env`, scripts auxiliares, planos (não versionar segredos) |

---

## Como os dois pilares se conectam

- **Mesma URL final** — anúncios e botões do GBP devem apontar para a mesma landing (`YOUR_LANDING_PAGE_URL` no `CONFIG.md`).
- **Extensão de local** — no Google Ads, vincule o GBP para reforçar confiança e consistência NAP (nome, endereço, telefone).
- **Reviews e reputação** — volume de avaliações no GBP apoia conversão dos cliques pagos e o ranking no mapa.
- **Operação** — revisão semanal de termos de pesquisa e negativas (Ads) + post/foto/review no ritmo definido em `GoogleBusiness/`.

Detalhes de cadência: [`PaidTraffic/README.md`](./PaidTraffic/README.md) (manutenção de ads) e [`GoogleBusiness/README.md`](./GoogleBusiness/README.md) (manutenção de perfil).

---

## Configuração rápida

1. Preencher [`CONFIG.md`](./CONFIG.md) (telefone, URL da landing, link de review do Google).
2. Seguir checklist de campanha: [`PaidTraffic/campaign-checklist.md`](./PaidTraffic/campaign-checklist.md).
3. Seguir setup GBP: [`GoogleBusiness/checklist-setup.md`](./GoogleBusiness/checklist-setup.md).
