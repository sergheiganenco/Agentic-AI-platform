from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    debug: bool = False
    app_name: str = "Agentic AI"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # SSO/OAuth settings
    azure_client_id: str = ""
    azure_client_secret: str = ""
    azure_tenant_id: str = ""
    azure_authority: str = ""
    azure_redirect_uri: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""

    MONGO_URI: str = "mongodb://localhost:27017"  # or your actual MongoDB URI

    CELERY_BROKER_URL: str = "redis://localhost:6379/0" 

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
