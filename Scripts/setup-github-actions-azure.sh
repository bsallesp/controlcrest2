#!/usr/bin/env bash
# Cria (ou reutiliza) um App Registration com Federated Credential para GitHub Actions,
# atribui Contributor ao RG do Control Crest e grava secrets no GitHub com `gh secret set`.
#
# Pré-requisitos: az login, gh auth login, permissões para criar App Registration e role assignment.
#
# Uso: ./Scripts/setup-github-actions-azure.sh
# Opcional: RG_NAME, APP_DISPLAY_NAME, REPO (override), SUBSCRIPTION_ID

set -euo pipefail

RG_NAME="${RG_NAME:-rg-control-crest-prod}"
APP_DISPLAY_NAME="${APP_DISPLAY_NAME:-controlcrest-github-actions}"
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-$(az account show --query id -o tsv)}"
TENANT_ID="$(az account show --query tenantId -o tsv)"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instale o GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"
if [[ -z "${REPO}" ]]; then
  echo "Defina REPO=owner/repo ou rode dentro de um clone com gh configurado." >&2
  exit 1
fi

echo "Repo GitHub: $REPO"
echo "Subscription: $SUBSCRIPTION_ID"
echo "Resource group: $RG_NAME"

SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}"

APP_ID="$(az ad app list --display-name "${APP_DISPLAY_NAME}" --query '[0].appId' -o tsv 2>/dev/null || true)"
if [[ -z "${APP_ID}" || "${APP_ID}" == "null" ]]; then
  echo "Criando App Registration ${APP_DISPLAY_NAME}..."
  APP_ID="$(az ad app create --display-name "${APP_DISPLAY_NAME}" --query appId -o tsv)"
else
  echo "Reutilizando app existente appId=${APP_ID}"
fi

if ! az ad sp show --id "${APP_ID}" &>/dev/null; then
  echo "Criando service principal..."
  az ad sp create --id "${APP_ID}" >/dev/null
fi

echo "Atribuindo Contributor em ${SCOPE}..."
az role assignment create \
  --assignee "${APP_ID}" \
  --role Contributor \
  --scope "${SCOPE}" \
  --output none 2>/dev/null || echo "(assignment já existe ou aguardando propagação)"

CRED_DIR="$(mktemp -d)"
trap 'rm -rf "${CRED_DIR}"' EXIT

add_fed_cred() {
  local name="$1"
  local subject="$2"
  local file="${CRED_DIR}/${name}.json"
  cat >"${file}" <<EOF
{
  "name": "${name}",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "${subject}",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF
  if az ad app federated-credential list --id "${APP_ID}" --query "[?name=='${name}'].name" -o tsv | grep -q .; then
    echo "Federated credential já existe: ${name}"
    return 0
  fi
  echo "Criando federated credential: ${name}"
  az ad app federated-credential create --id "${APP_ID}" --parameters "@${file}"
}

add_fed_cred "github-main" "repo:${REPO}:ref:refs/heads/main"
add_fed_cred "github-master" "repo:${REPO}:ref:refs/heads/master"

echo "Gravando secrets no GitHub (gh secret set)..."
gh secret set AZURE_CLIENT_ID --repo "${REPO}" --body "${APP_ID}"
gh secret set AZURE_TENANT_ID --repo "${REPO}" --body "${TENANT_ID}"
gh secret set AZURE_SUBSCRIPTION_ID --repo "${REPO}" --body "${SUBSCRIPTION_ID}"

echo ""
echo "Concluído. Secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID"
echo "App (client) id: ${APP_ID}"
echo "Dispare o workflow: gh workflow run deploy-controlcrest.yml -R ${REPO}"
