import asyncio
import uuid
from pathlib import Path

import edge_tts

from app.config import settings


async def text_to_speech(text: str, output_dir: str, voice: str | None = None) -> str:
    filename = f"{uuid.uuid4()}.mp3"
    output_path = Path(output_dir) / filename
    communicate = edge_tts.Communicate(text, voice or settings.tts_voice)
    await communicate.save(str(output_path))
    return str(output_path)
