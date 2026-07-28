from functools import lru_cache

@lru_cache(maxsize=1)
def _get_model():
    from faster_whisper import WhisperModel
    return WhisperModel(settings.stt_model, device="cpu", compute_type="int8")


def speech_to_text(audio_path: str) -> str:
    try:
        from app.config import settings
        model = _get_model()
        segments, _ = model.transcribe(
            audio_path,
            beam_size=1,
            vad_filter=False,
            language="en",
        )
        return " ".join(seg.text.strip() for seg in segments)
    except Exception as e:
        print(f"STT Exception: {e}")
        return ""
