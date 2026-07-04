import asyncio
from google.adk.models import BaseLlm, LlmRequest, LlmResponse, LLMRegistry
from typing import AsyncGenerator
from google.genai import types

class FallbackLlm(BaseLlm):
    model: str = "fallback_wrapper"
    primary: str
    fallback: str

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        
        primary_cls = LLMRegistry.resolve(self.primary)
        primary_llm = primary_cls(model=self.primary)
        generator = primary_llm.generate_content_async(llm_request, stream)
        try:
            first_chunk = await generator.__anext__()
        except Exception as e:
            if True: # Force fallback for testing
                print(f"[Fallback] Switching to {self.fallback}...")
                fallback_cls = LLMRegistry.resolve(self.fallback)
                fallback_llm = fallback_cls(model=self.fallback)
                async for chunk in fallback_llm.generate_content_async(llm_request, stream):
                    yield chunk
                return
            else:
                raise e
        
        yield first_chunk
        async for chunk in generator:
            yield chunk

async def main():
    llm = FallbackLlm(primary="gemini-invalid", fallback="gemini-3.1-flash-lite")
    req = LlmRequest(contents=[types.Content(role="user", parts=[types.Part.from_text(text="say hi")])])
    async for chunk in llm.generate_content_async(req):
        print("Chunk:", chunk.parts[0].text if chunk.parts else chunk)

if __name__ == "__main__":
    asyncio.run(main())
