import asyncio
from app.utils.llm import ask_llm

async def main():
    result = await ask_llm("What is Agentic AI in one sentence?")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
