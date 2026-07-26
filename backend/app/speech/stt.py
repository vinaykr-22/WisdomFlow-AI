from functools import lru_cache

from faster_whisper import WhisperModel

from app.config import settings


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    return WhisperModel(settings.stt_model, device="cpu", compute_type="int8")


def speech_to_text(audio_path: str) -> str:
    model = _get_model()
    segments, _ = model.transcribe(
        audio_path,
        beam_size=1,
        vad_filter=True,
        language="en",
    )
    return " ".join(seg.text.strip() for seg in segments)
