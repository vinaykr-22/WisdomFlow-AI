from functools import lru_cache
from pathlib import Path
from app.config import settings


@lru_cache(maxsize=1)
def _get_local_model():
    from faster_whisper import WhisperModel
    return WhisperModel(settings.stt_model, device="cpu", compute_type="int8")


def speech_to_text(audio_path: str) -> str:
    # 1. Try Groq Cloud Whisper API if key is configured
    if settings.llm_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
            with open(audio_path, "rb") as f:
                filename = Path(audio_path).name
                res = client.audio.transcriptions.create(
                    file=(filename, f.read()),
                    model="whisper-large-v3-turbo",
                    language="en",
                )
                text = getattr(res, "text", "") or ""
                if text.strip():
                    return text.strip()
        except Exception as e:
            print(f"Groq Cloud STT error (falling back to local): {e}")

    # 2. Fallback to local faster_whisper
    try:
        model = _get_local_model()
        segments, _ = model.transcribe(
            audio_path,
            beam_size=1,
            vad_filter=False,
            language="en",
        )
        return " ".join(seg.text.strip() for seg in segments if hasattr(seg, "text"))
    except Exception as e:
        print(f"Local STT Exception: {e}")
        return ""
