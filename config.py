import os
from datetime import timedelta

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # MySQL Configuration
    MYSQL_HOST = os.getenv("MYSQL_ADDON_HOST", "bxn6gxbdphxn0eyrj5rv-mysql.services.clever-cloud.com")
    MYSQL_USER = os.getenv("MYSQL_ADDON_USER", "uc7mxrhw5nmds2tn")
    MYSQL_PASSWORD = os.getenv("MYSQL_ADDON_PASSWORD", "lzUgNO6sy3YP5t5FUt5C")
    MYSQL_DB = os.getenv("MYSQL_ADDON_DB", "bxn6gxbdphxn0eyrj5rv")
    MYSQL_PORT = int(os.getenv("MYSQL_ADDON_PORT", 3306))
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")

    
    # Email Configuration (SMTP)
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME') or 'your-email@gmail.com'
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD') or 'your-app-password'
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'noreply@futuremech.com'
    
    # Stripe Configuration
    # Replace the Stripe keys with actual test keys
    STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY') or 'pk_test_51PYourActualPublicKeyHere'
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') or 'sk_test_51PYourActualSecretKeyHere'
    
    # File Upload Configuration
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    
    # Security Configuration
    CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    
    # Add these Google OAuth configurations
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID') or 'your-google-client-id'
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET') or 'your-google-client-secret'
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"