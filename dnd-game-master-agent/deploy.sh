#!/usr/bin/env bash
#
# Deploy dnd-game-master-agent to Cloud Run (source build via Cloud Build).
# Re-runnable: run it any time to push the current code. Minimal-cost config
# (scale-to-zero, single instance) suitable for a demo/prototype.
#
# Usage:  ./deploy.sh            # deploy
#         ./deploy.sh --dry-run  # print the gcloud command without running it
#
# Prereqs: fill in cloudrun.env.yaml (secrets) first. That file is gitignored.

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
PROJECT="dnd-game-master-501218"
REGION="us-east1"
SERVICE="dnd-game-master-agent"
ENV_FILE="cloudrun.env.yaml"

# Minimal-cost sizing for a demo:
#   min-instances 0 → scale to zero, no idle billing (cold start on first hit)
#   max-instances 1 → one instance, so the SQLite⇄Mongo session store has a
#                     single writer (no cross-instance divergence) and cost is capped
#   default CPU throttling (CPU billed only during requests) → cheapest
CPU="1"
MEMORY="1Gi"          # bump to 2Gi if you see OOM / 503 on cold start
MIN_INSTANCES="0"
MAX_INSTANCES="1"
CONCURRENCY="8"

DRY_RUN=""
[[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]] && DRY_RUN="1"

# Run from this script's directory (so --source . = the agent dir).
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Preflight ────────────────────────────────────────────────────────────────
command -v gcloud >/dev/null || { echo "❌ gcloud not found. Install the Google Cloud SDK."; exit 1; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found. Create it (see cloudrun.env.yaml template) and set your secrets."
  exit 1
fi
if grep -q "REPLACE_ME" "$ENV_FILE"; then
  echo "❌ $ENV_FILE still contains REPLACE_ME placeholders. Fill in real values before deploying."
  exit 1
fi

# Ensure an authenticated gcloud user (Cloud Build source deploy uses user creds).
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "🔑 No active gcloud account — launching login…"
  gcloud auth login
fi

gcloud config set project "$PROJECT" >/dev/null
echo "✅ Project: $PROJECT   Account: $(gcloud config get-value account 2>/dev/null)"

# Enable required APIs (idempotent; no-op if already on).
echo "🔌 Ensuring required APIs are enabled…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com aiplatform.googleapis.com \
  --project "$PROJECT" >/dev/null

# Grant the build identity (Compute Engine default SA, used by Cloud Run source
# builds) permission to read the uploaded source and run the build. Idempotent —
# needed on the first deploy, a no-op thereafter.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "🔐 Ensuring build SA ($BUILD_SA) has build/storage roles…"
for ROLE in roles/cloudbuild.builds.builder roles/storage.objectViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${BUILD_SA}" --role="$ROLE" \
    --condition=None --quiet >/dev/null
done

# ── Deploy ───────────────────────────────────────────────────────────────────
DEPLOY_ARGS=(
  run deploy "$SERVICE"
  --project "$PROJECT"
  --region "$REGION"
  --source .
  --cpu "$CPU"
  --memory "$MEMORY"
  --min-instances "$MIN_INSTANCES"
  --max-instances "$MAX_INSTANCES"
  --concurrency "$CONCURRENCY"
  --allow-unauthenticated
  --env-vars-file "$ENV_FILE"
  --labels created-by=adk
)

if [[ -n "$DRY_RUN" ]]; then
  echo "DRY RUN — would execute:"
  echo "gcloud ${DEPLOY_ARGS[*]}"
  exit 0
fi

echo "🚀 Deploying $SERVICE to Cloud Run (Cloud Build will build the Dockerfile from source)…"
gcloud "${DEPLOY_ARGS[@]}"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo ""
echo "✅ Deployed: $URL"
echo "   Health:   curl $URL/health/db"
