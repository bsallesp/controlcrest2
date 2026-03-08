# Google Business Profile — API Manager

Módulo para gerenciar o **Google Business Profile** via API: listar contas e locais, criar posts (a partir dos templates semanais), listar reviews.

---

## Pré-requisitos (Google)

1. **Perfil no ar**  
   Crie ou reivindique o perfil em [business.google.com](https://business.google.com) e complete o máximo possível (nome, categorias, descrição, área, horários, telefone, site).

2. **Acesso à API**  
   A API do GBP **não é aberta** para qualquer projeto. É preciso:
   - Ter um **site** que represente o negócio.
   - Ter um GBP **verificado e ativo por pelo menos 60 dias**.
   - Pedir acesso em: [Solicitar acesso às APIs do GBP](https://support.google.com/business/contact/api_default) → "Application for Basic API Access".
   - Informar o **Project Number** do projeto no Google Cloud Console.
   - Aguardar aprovação (quota 300 QPM = aprovado).

3. **Projeto no Google Cloud**  
   - [Console](https://console.cloud.google.com) → Criar projeto (ou usar existente).
   - Ativar a API: **Google My Business API** (e, se for usar Business Information, **Business Profile Business Information API**).
   - Credenciais → **OAuth 2.0** → Criar ID de cliente tipo **Aplicativo para computador**.
   - Baixar o JSON e salvar como `client_secrets.json` nesta pasta (`GoogleBusiness/api/`).

---

## Setup local

```bash
cd GoogleBusiness/api
pip install -r requirements.txt
```

Coloque o arquivo de credenciais OAuth na pasta:

- `GoogleBusiness/api/client_secrets.json`  
  (o mesmo que você baixou do Cloud Console como “Client secrets” do app para computador)

Na primeira execução, o script abre o navegador para você fazer login na conta do GBP e autorizar o app. O token fica salvo em `token.json` e será reutilizado depois.

---

## Uso

### Listar contas e locais

```python
from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations

service = get_gbp_client()
accounts = list_accounts(service)
for acc in accounts.get("accounts", []):
    print(acc["name"], acc.get("accountName"))
    locs = list_locations(service, acc["name"])
    for loc in locs.get("locations", []):
        print("  ", loc.get("title"), loc["name"])
```

### Criar um post (template semanal)

```python
from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations, create_post
from GoogleBusiness.api.posts import build_post_from_template

service = get_gbp_client()
accounts = list_accounts(service)
account = accounts["accounts"][0]
account_id = account["name"].split("/")[-1]
locs = list_locations(service, account["name"])
location_id = locs["locations"][0]["name"].split("/")[-1]

# Template 0 = Same-day service (LEARN_MORE → landing)
body = build_post_from_template(
    0,
    landing_page_url="https://seusite.com",
    media_url="https://...",  # opcional
)
create_post(service, account_id, location_id, body)
```

### Listar reviews

```python
from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations, list_reviews

service = get_gbp_client()
# ... obter account_id e location_id como acima
reviews = list_reviews(service, account_id, location_id)
for r in reviews.get("reviews", []):
    print(r.get("starRating"), r.get("comment"))
```

### Script de exemplo (post semanal)

```bash
# Definir URL da landing (ou passar como argumento)
set LANDING_PAGE_URL=https://seusite.com
python -m GoogleBusiness.api.run_example

# Ou:
python -m GoogleBusiness.api.run_example https://seusite.com
```

O exemplo usa o primeiro account e o primeiro location e publica o template 0 (Same-day service).

---

## Templates de post

Os templates estão em `posts.WEEKLY_POST_TEMPLATES` e espelham o conteúdo de `../weekly-posts-templates.md`:

| Índice | Nome            | CTA        |
|--------|-----------------|------------|
| 0      | Same-day service| Get a quote (LEARN_MORE) |
| 1      | Just completed  | Call now   |
| 2      | Tip             | Get a quote |
| 3      | Offer / seasonal| Call now   |
| 4      | Social proof    | Call now   |
| 5      | Reminder        | Get a quote |

Para “Get a quote” use `landing_page_url`; para “Call now” o botão é CTA tipo CALL (sem URL).

---

## Estrutura

| Arquivo              | Função                                      |
|----------------------|---------------------------------------------|
| `auth.py`            | OAuth2 com `client_secrets.json` e `token.json` |
| `client.py`          | Cliente My Business v4 (accounts, locations, localPosts, reviews) |
| `posts.py`           | Montagem de `LocalPost` e templates semanais |
| `run_example.py`     | Exemplo: listar conta/local e criar 1 post  |
| `requirements.txt`  | Dependências Python                         |

Depois de aprovado o acesso à API e configurado o OAuth, você pode automatizar posts semanais, leitura de reviews e, se quiser, integrar com Business Information API para atualizar dados do local.
