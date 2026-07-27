from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    database_url: str = "sqlite+aiosqlite:///./learnflow.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    llm_api_key: str = ""
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"
    upload_dir: str = "uploads"
    stt_model: str = "tiny"
    tts_voice: str = "en-US-AvaNeural"

    # ── Deployment settings ──
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000"
    ollama_base_url: str = "http://localhost:11434/v1"

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
