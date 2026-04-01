#!/usr/bin/env bash
# Update existing deploy: Function submit-contact + static site to storage.
set -u

SUBSCRIPTION_ID='39b8497a-8d94-42aa-b43a-ae9ac3ae9932'
RG='rg-control-crest-prod'
STORAGE_NAME='stcce78f20af4fb'
FUNCTION_NAME='func-cc-5c7775b3cf'
ACS_RG='thelaserspace-prod'
ACS_NAME='thelaser-comm'
MAIL_TO='bsallesp@gmail.com'
MAIL_FROM='DoNotReply@49056c6a-2022-4812-8cdd-a9617428d269.azurecomm.net'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LANDING_DIR="$REPO_ROOT/LandingPage"
FUNC_DIR="$REPO_ROOT/AzureFunctions/SubmitContact"
TEMP_DIR="$REPO_ROOT/temp"
ENV_TS="$LANDING_DIR/src/environments/environment.ts"
ENV_DEV_TS="$LANDING_DIR/src/environments/environment.development.ts"
DIST_BROWSER="$LANDING_DIR/dist/landing-page-ng/browser"
API_URL="https://${FUNCTION_NAME}.azurewebsites.net/api/submit-contact"
ZIP_PATH="$TEMP_DIR/deploy-func-cc-update.zip"

# Capture $? after az — do not use `if az ...; then` (unreliable exit codes in Git Bash).
az_retry() {
  local max=12
  local n=0
  local code=1
  while [[ $n -lt $max ]]; do
    n=$((n + 1))
    "$@"
    code=$?
    if [[ $code -eq 0 ]]; then
      return 0
    fi
    echo "az exit $code, attempt $n/$max, sleep 6s..." >&2
    sleep 6
  done
  return "$code"
}

get_acs_conn() {
  local i
  for i in $(seq 1 12); do
    local out
    out=$(az communication list-key --name "$ACS_NAME" --resource-group "$ACS_RG" --query 'primaryConnectionString' -o tsv 2>/dev/null) || true
    if [[ -n "$out" ]]; then
      echo "$out"
      return 0
    fi
    echo "list-key attempt $i, sleep 8s..." >&2
    sleep 8
  done
  return 1
}

mkdir -p "$TEMP_DIR"

echo 'Setting subscription...'
az_retry az account set --subscription "$SUBSCRIPTION_ID" || exit 1

echo 'Fetching ACS connection string...'
ACS_CONN=$(get_acs_conn) || { echo 'Could not read ACS connection string.' >&2; exit 1; }

WEB_ENDPOINT=''
for _ in $(seq 1 8); do
  WEB_ENDPOINT=$(az storage account show --name "$STORAGE_NAME" --resource-group "$RG" --query 'primaryEndpoints.web' -o tsv 2>/dev/null) || true
  if [[ -n "$WEB_ENDPOINT" ]]; then break; fi
  sleep 5
done
if [[ -z "$WEB_ENDPOINT" ]]; then
  echo 'Could not read storage web endpoint.' >&2
  exit 1
fi
WEB_ORIGIN="${WEB_ENDPOINT%/}"
ALLOWED_ORIGINS="${WEB_ORIGIN},http://localhost:4200,http://127.0.0.1:4200"

echo 'Configuring Function app settings...'
az_retry az functionapp config appsettings set \
  --name "$FUNCTION_NAME" \
  --resource-group "$RG" \
  --settings \
  "ACS_CONNECTION_STRING=$ACS_CONN" \
  "MAIL_FROM_ADDRESS=$MAIL_FROM" \
  "MAIL_TO_ADDRESS=$MAIL_TO" \
  "ALLOWED_ORIGIN=$ALLOWED_ORIGINS" \
  'FUNCTIONS_WORKER_RUNTIME=node' || exit 1

echo 'npm ci and zip Function...'
cd "$FUNC_DIR" || exit 1
if [[ ! -d node_modules ]]; then
  npm ci --omit=dev || exit 1
fi
rm -f "$ZIP_PATH"
cd "$FUNC_DIR" || exit 1
if command -v zip >/dev/null 2>&1; then
  zip -r -q "$ZIP_PATH" host.json package.json package-lock.json node_modules SubmitContact
elif tar --version >/dev/null 2>&1; then
  tar -a -c -f "$ZIP_PATH" host.json package.json package-lock.json node_modules SubmitContact
else
  echo 'Need zip or tar to package the Function.' >&2
  exit 1
fi

echo 'Zip deploy to Function App (1-2 min)...'
az_retry az functionapp deployment source config-zip \
  --resource-group "$RG" \
  --name "$FUNCTION_NAME" \
  --src "$ZIP_PATH" || exit 1

echo 'Updating environment.ts and environment.development.ts...'
if command -v sed >/dev/null 2>&1; then
  sed -i.bak "s|contactApiUrl: '[^']*'|contactApiUrl: '${API_URL}'|" "$ENV_TS" && rm -f "${ENV_TS}.bak"
  sed -i.bak "s|contactApiUrl: '[^']*'|contactApiUrl: '${API_URL}'|" "$ENV_DEV_TS" && rm -f "${ENV_DEV_TS}.bak"
else
  echo 'sed not found' >&2
  exit 1
fi

echo 'ng build production...'
cd "$LANDING_DIR" || exit 1
npx ng build --configuration=production || exit 1

if [[ ! -d "$DIST_BROWSER" ]]; then
  echo "Build output not found: $DIST_BROWSER" >&2
  exit 1
fi

echo 'Uploading to storage static website...'
STORAGE_CONN=''
for _ in $(seq 1 8); do
  STORAGE_CONN=$(az storage account show-connection-string --name "$STORAGE_NAME" --resource-group "$RG" --query connectionString -o tsv 2>/dev/null) || true
  if [[ -n "$STORAGE_CONN" ]]; then break; fi
  sleep 5
done
if [[ -z "$STORAGE_CONN" ]]; then
  echo 'Could not read storage connection string.' >&2
  exit 1
fi

az_retry az storage blob upload-batch \
  --connection-string "$STORAGE_CONN" \
  --destination '$web' \
  --source "$DIST_BROWSER" \
  --overwrite || exit 1

echo ''
echo '=== DEPLOY OK ==='
echo "Static site: $WEB_ENDPOINT"
echo "Submit API:  $API_URL"
echo "Email to:    $MAIL_TO"
