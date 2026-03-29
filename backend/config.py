# config.py
import os
from dotenv import load_dotenv

load_dotenv() 

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

    # IBM App ID
    APPID_TENANT_ID = os.getenv("APPID_TENANT_ID")
    APPID_CLIENT_ID = os.getenv("APPID_CLIENT_ID")
    APPID_CLIENT_SECRET = os.getenv("APPID_CLIENT_SECRET")
    APPID_OAUTH_SERVER_URL = os.getenv("APPID_OAUTH_SERVER_URL")
    APPID_REGION = os.getenv("APPID_REGION")

    # Cloudant
    CLOUDANT_URL = os.getenv("CLOUDANT_URL")
    CLOUDANT_API_KEY = os.getenv("CLOUDANT_API_KEY")
    CLOUDANT_DB_NAME = os.getenv("CLOUDANT_DB_NAME")

    # IAM
    IBM_IAM_API_KEY = os.getenv("IBM_IAM_API_KEY")

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

    # Cloudinary
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

