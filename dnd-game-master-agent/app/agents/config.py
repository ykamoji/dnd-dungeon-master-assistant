import os
from dotenv import load_dotenv
load_dotenv()

# Hosted default (unchanged behavior). Strip surrounding whitespace/quotes:
# `docker run --env-file` passes values literally, so GOOGLE_MODEL="gemini-..."
# in an env file would otherwise include the quotes and break LLMRegistry.resolve.
_HOSTED_MODEL = os.getenv("GOOGLE_MODEL").strip().strip("\"'")
_SMART_MODEL = os.getenv("SMART_MODEL").strip().strip("\"'")

# Local dev: route through a local Ollama model to avoid Google API rate limits.
# Enable with USE_LOCAL_LLM=1 (and `ollama run gemma4:e2b-mxfp8` running locally).
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "").lower() in ("1", "true", "yes")

if USE_LOCAL_LLM:
    from google.adk.models.lite_llm import LiteLlm

    LOCAL_MODEL = os.getenv("LOCAL_LLM_MODEL", "ollama_chat/gemma4:e2b-mxfp8")
    MODEL = LiteLlm(
        model=LOCAL_MODEL,
        api_base=os.getenv("OLLAMA_API_BASE", "http://localhost:11434"),
    )
    SMART_MODEL = MODEL
else:
    MODEL = _HOSTED_MODEL
    SMART_MODEL = _SMART_MODEL

from google.genai import types


THINKING_CONFIG = types.GenerateContentConfig(
    max_output_tokens=8192,
    thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.HIGH)
)

LARGE_OUTPUT_CONFIG = types.GenerateContentConfig(
    max_output_tokens=16384,
    thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.MEDIUM)
)

LOW_THINKING_CONFIG = types.GenerateContentConfig(
    max_output_tokens=8192,
    thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW)
)