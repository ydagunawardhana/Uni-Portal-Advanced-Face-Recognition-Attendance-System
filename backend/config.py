import os
from dotenv import load_dotenv # type: ignore

load_dotenv()

# Database

DB_USER     = os.getenv("DB_USER",     "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_HOST     = os.getenv("DB_HOST",     "localhost")
DB_PORT     = os.getenv("DB_PORT",     "5432")
DB_NAME     = os.getenv("DB_NAME",     "attendance_db")

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# App

APP_TITLE       = "Face Recognition Attendance System API"
APP_DESCRIPTION = "Backend API for managing student attendance via face recognition."
APP_VERSION     = "1.0.0"

# CORS – origins allowed to call this API

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
).split(",")


if os.getenv("ENV", "development") == "development":
    ALLOWED_ORIGINS = ["*"]


# SMTP Settings (For Password Reset)
SMTP_SERVER   = os.getenv("SMTP_SERVER",   "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",     "your-university@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your-app-password")

# AI Services
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

