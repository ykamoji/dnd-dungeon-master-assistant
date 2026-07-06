#!/usr/bin/env bash
#
# Deploy dnd-game-master-client (Next.js) to Cloud Run.
# Two steps because Next bakes BACKEND_ORIGIN at build time:
#   1. Cloud Build builds the image with --build-arg BACKEND_ORIGIN=<from yaml>
#   2. Deploy that image to Cloud Run (scale-to-zero, single instance).
#
# On each run Cloud Run replaces the running container with a fresh revision,
# and the script prunes older image versions from Artifact Registry (keeping only
# the just-deployed one) so old builds don't pile up.
#
# Usage:  ./deploy.sh            # build + deploy
#         ./deploy.sh --dry-run  # print the commands without running them
#
# Re-runnable: run any time to push current code. Edit cloudrun.env.yaml to
# change the backend URL.

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
PROJECT="dnd-game-master-501218"
REGION="us-east1"
SERVICE="dnd-dungeon-master-client"
REPO="cloud-run-source-deploy"        # shared Artifact Registry repo (same as backend)
ENV_FILE="cloudrun.env.yaml"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"
IMAGE="${IMAGE_PATH}:latest"

# Minimal-cost sizing for a demo (front-end serving is light):
#   min 0 → scale to zero (no idle cost)   max 1 → cap cost
#   timeout 3600 → keep long-lived SSE proxy connections alive
CPU="1"
MEMORY="512Mi"        # bump to 1Gi if you see OOM / 503
MIN_INSTANCES="0"
MAX_INSTANCES="1"
TIMEOUT="3600"

DRY_RUN=""
[[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]] && DRY_RUN="1"

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Preflight ────────────────────────────────────────────────────────────────
command -v gcloud >/dev/null || { echo "❌ gcloud not found. Install the Google Cloud SDK."; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "❌ $ENV_FILE not found."; exit 1; }

# Extract BACKEND_ORIGIN (strip quotes / inline comments / whitespace).
BACKEND_ORIGIN="$(grep -E '^[[:space:]]*BACKEND_ORIGIN:' "$ENV_FILE" | head -1 \
  | sed -E 's/^[^:]*:[[:space:]]*//; s/#.*$//; s/^"//; s/"[[:space:]]*$//; s/[[:space:]]*$//')"
[[ -n "$BACKEND_ORIGIN" ]] || { echo "❌ BACKEND_ORIGIN not set in $ENV_FILE."; exit 1; }
case "$BACKEND_ORIGIN" in
  *localhost*|*127.0.0.1*)
    echo "❌ BACKEND_ORIGIN is '$BACKEND_ORIGIN' — set it to the deployed backend URL before deploying."
    exit 1 ;;
esac
echo "🔗 BACKEND_ORIGIN = $BACKEND_ORIGIN"

if [[ -n "$DRY_RUN" ]]; then
  echo "DRY RUN — would execute:"
  echo "  gcloud builds submit --project $PROJECT --config cloudbuild.yaml \\"
  echo "    --substitutions=_BACKEND_ORIGIN=$BACKEND_ORIGIN,_IMAGE=$IMAGE ."
  echo "  gcloud run deploy $SERVICE --project $PROJECT --region $REGION --image $IMAGE \\"
  echo "    --cpu $CPU --memory $MEMORY --min-instances $MIN_INSTANCES --max-instances $MAX_INSTANCES \\"
  echo "    --timeout $TIMEOUT --allow-unauthenticated --labels created-by=adk"
  echo "  then prune old images under: ${IMAGE_PATH}"
  exit 0
fi

# Ensure an authenticated gcloud user.
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "🔑 No active gcloud account — launching login…"
  gcloud auth login
fi
gcloud config set project "$PROJECT" >/dev/null
echo "✅ Project: $PROJECT   Account: $(gcloud config get-value account 2>/dev/null)"

# Enable required APIs (idempotent).
echo "🔌 Ensuring required APIs are enabled…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com --project "$PROJECT" >/dev/null

# Ensure the Artifact Registry repo exists.
gcloud artifacts repositories describe "$REPO" --location "$REGION" --project "$PROJECT" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPO" --repository-format=docker \
    --location "$REGION" --project "$PROJECT"

# ── 1. Build (bakes BACKEND_ORIGIN) ──────────────────────────────────────────
echo "🏗️  Building image via Cloud Build…"
gcloud builds submit --project "$PROJECT" --config cloudbuild.yaml \
  --substitutions="_BACKEND_ORIGIN=${BACKEND_ORIGIN},_IMAGE=${IMAGE}" .

# ── 2. Deploy ────────────────────────────────────────────────────────────────
echo "🚀 Deploying $SERVICE to Cloud Run…"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --image "$IMAGE" \
  --cpu "$CPU" --memory "$MEMORY" \
  --min-instances "$MIN_INSTANCES" --max-instances "$MAX_INSTANCES" \
  --timeout "$TIMEOUT" \
  --allow-unauthenticated \
  --labels created-by=adk

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
echo "   Backend proxied to: $BACKEND_ORIGIN"
