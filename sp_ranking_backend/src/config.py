import os
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# PUBLIC_INTERFACE
class Settings(BaseModel):
    """Application settings loaded from environment variables."""
    FINNHUB_API_KEY: str = Field(default=os.getenv("FINNHUB_API_KEY", ""), description="Finnhub API key")
    DB_URL: str = Field(default=os.getenv("DB_URL", "sqlite:///./data/app.db"), description="Database URL")
    BACKEND_PORT: int = Field(default=int(os.getenv("BACKEND_PORT", "8000")), description="Backend port")
    BATCH_SIZE: int = Field(default=int(os.getenv("BATCH_SIZE", "25")), description="Batch size for processing")
    MAX_CONCURRENCY: int = Field(default=int(os.getenv("MAX_CONCURRENCY", "5")), description="Max concurrency for tasks")
    CACHE_TTL_MINUTES: int = Field(default=int(os.getenv("CACHE_TTL_MINUTES", "1440")), description="Cache TTL in minutes")
    EXPORT_TMP_DIR: str = Field(default=os.getenv("EXPORT_TMP_DIR", "./exports"), description="Temporary export directory")
    ALLOWED_ORIGINS: List[str] = Field(default_factory=list, description="CORS allowed origins")

    # PUBLIC_INTERFACE
    @classmethod
    def load(cls) -> "Settings":
        """Create a Settings instance from environment variables."""
        origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
        if origins_raw.strip() == "*" or origins_raw.strip() == "":
            origins = ["*"]
        else:
            origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
        s = cls(ALLOWED_ORIGINS=origins)
        # Ensure export directory exists
        try:
            os.makedirs(s.EXPORT_TMP_DIR, exist_ok=True)
            # Ensure sqlite directory exists if using file-based path
            if s.DB_URL.startswith("sqlite:///"):
                db_path = s.DB_URL.replace("sqlite:///", "")
                db_dir = os.path.dirname(db_path)
                if db_dir:
                    os.makedirs(db_dir, exist_ok=True)
        except Exception:
            # Directory creation failures shouldn't crash app initialization
            pass
        return s

settings = Settings.load()
