# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Self-contained build: context = this dir. docs/ and assets/ now live inside the
# agent dir, so a plain `gcloud run deploy --source .` from here works.

FROM python:3.12-slim

RUN pip install --no-cache-dir uv==0.8.13

WORKDIR /code

# --- Python project (deps first for layer caching, then source) ---
COPY ./pyproject.toml ./README.md ./uv.lock* ./
COPY ./app ./app
# pyproject builds packages = ["app", "data"]; data holds the open5e reference JSON.
COPY ./data ./data

RUN uv sync --frozen

# --- Adventure content (read at runtime; project_root = agent_root = /code) ---
COPY ./docs ./docs
COPY ./assets ./assets

ARG COMMIT_SHA=""
ENV COMMIT_SHA=${COMMIT_SHA}

ARG AGENT_VERSION=0.0.0
ENV AGENT_VERSION=${AGENT_VERSION}

EXPOSE 8080

CMD ["uv", "run", "uvicorn", "app.fast_api_app:app", "--host", "0.0.0.0", "--port", "8080"]
