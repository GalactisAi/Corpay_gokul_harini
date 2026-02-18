from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database - Supabase PostgreSQL connection string
    # Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    # Or use connection pooler: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
    # Get your connection string from: https://app.supabase.com/project/YOUR_PROJECT/settings/databa

    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dashboard.db").replace("DATABASE_URL=", "")

    
    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    supabase_storage_bucket: str = os.getenv("SUPABASE_STORAGE_BUCKET", "slides")
    
    # JWT
    jwt_secret_key: str = "your-secret-key-here-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    oauth_redirect_uri: str = "http://localhost:8000/api/admin/auth/callback"
    
    # CORS
    # Note: include all dev ports you might use for Vite/React frontends.
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
    ]
    
    # File Storage
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50
    
    # External APIs
    share_price_api_url: str = ""
    share_price_api_key: str = ""
    linkedin_api_url: str = ""
    linkedin_api_key: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_company_url: str = "https://www.linkedin.com/company/galactisaitech/posts/?feedView=all"
    linkedin_company_urn: str = ""  # LinkedIn URN for company (e.g., urn:li:organization:123456)
    linkedin_vanity_name: str = "galactisaitech"  # Company vanity name from URL
    powerbi_client_id: str = ""
    powerbi_client_secret: str = ""
    powerbi_tenant_id: str = ""
    powerbi_workspace_id: str = ""
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

