from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///./data_analyzer.db"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    ANTHROPIC_API_KEY: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
