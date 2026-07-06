#!/usr/bin/env bash
#
# Deploy dnd-game-master-agent to Cloud Run (source build via Cloud Build).
# Re-runnable: run it any time to push the current code. Minimal-cost config
# (scale-to-zero, single instance) suitable for a demo/prototype.
#
# On each run Cloud Run replaces the running container with a fresh revision,
# and the script prunes older image versions from Artifact Registry (keeping only
# the just-deployed one) so old builds don't pile up.
#
# Usage:  ./deploy.sh            # deploy
#         ./deploy.sh --dry-run  # print the gcloud command without running it
#
# Prereqs: fill in cloudrun.env.yaml (secrets) first. That file is gitignored.

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
PROJECT="dnd-game-master-501218"
REGION="us-east1"
SERVICE="dnd-dungeon-master-agent"
ENV_FILE="cloudrun.env.yaml"
# gcloud run deploy --source pushes the built image here (repo/image = service).
REPO="cloud-run-source-deploy"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"

# Minimal-cost sizing for a demo:
#   min-instances 0 → scale to zero, no idle billing (cold start on first hit)
#   max-instances 1 → one instance, so the SQLite⇄Mongo session store has a
#                     single writer (no cross-instance divergence) and cost is capped
#   default CPU throttling (CPU billed only during requests) → cheapest
#
# concurrency must be HIGH because max-instances is pinned at 1: total capacity =
# concurrency (Cloud Run can't scale out). A console page load fires a burst of
# parallel fetches PLUS a long-lived SSE stream that holds a slot for the whole
# turn, so a low value (e.g. 8) causes 429 "Too Many Requests". The backend is
# async/IO-bound (waits on the model/Mongo), so 80 is safe for a demo.
CPU="1"
MEMORY="2Gi"          # headroom for higher concurrency; lower to 1Gi to cut cost
MIN_INSTANCES="0"
MAX_INSTANCES="1"     # keep at 1 — single SQLite writer for the session sync
CONCURRENCY="80"

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
  echo "then prune old images under: ${IMAGE_PATH}"
  exit 0
fi

echo "🚀 Deploying $SERVICE to Cloud Run (Cloud Build will build the Dockerfile from source)…"
gcloud "${DEPLOY_ARGS[@]}"

# ── Prune old images ─────────────────────────────────────────────────────────
# Keep the newest version (the one just deployed) and delete the rest so old
# builds don't accumulate in Artifact Registry.
echo "🧹 Pruning old images in ${IMAGE_PATH} (keeping the newest)…"
OLD_DIGESTS="$(gcloud artifacts docker images list "$IMAGE_PATH" \
  --project "$PROJECT" --sort-by="~CREATE_TIME" --format="value(version)" 2>/dev/null | tail -n +2)"
if [[ -n "$OLD_DIGESTS" ]]; then
  while IFS= read -r DIGEST; do
    [[ -z "$DIGEST" ]] && continue
    if gcloud artifacts docker images delete "${IMAGE_PATH}@${DIGEST}" \
         --project "$PROJECT" --delete-tags --quiet >/dev/null 2>&1; then
      echo "   deleted ${DIGEST}"
    else
      echo "   ⚠️  could not delete ${DIGEST} (in use or already gone)"
    fi
  done <<< "$OLD_DIGESTS"
else
  echo "   nothing to prune."
fi

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo ""
echo "✅ Deployed: $URL"
echo "   Health:   curl $URL/health/db"
