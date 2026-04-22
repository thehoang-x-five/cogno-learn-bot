from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database URL: prefer full URL in MYSQL_URL, otherwise build from parts
from app.config import settings

MYSQL_URL = os.getenv("MYSQL_URL")
if not MYSQL_URL:
    MYSQL_URL = f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"

# SQLAlchemy setup
engine = create_engine(MYSQL_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def init_mysql():
    """Import models (so they register with Base) and create tables.

    Call this at app startup or run this file directly to create tables.
    """
    # Import models so SQLAlchemy registers them with Base
    import app.models.user  # noqa: F401
    import app.models.subject  # noqa: F401
    import app.models.document  # noqa: F401
    import app.models.chat  # noqa: F401
    import app.models.system_settings  # noqa: F401
    import app.models.schedule  # noqa: F401
    import app.models.notification  # noqa: F401

    Base.metadata.create_all(bind=engine)
    print("✅ MySQL tables created/verified.")

    # Idempotent migrations
    from sqlalchemy import text

    # Migration 1: Add is_ai_generated column to generated_quizzes
    try:
        with engine.begin() as conn:
            result = conn.execute(text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'generated_quizzes' "
                "AND COLUMN_NAME = 'is_ai_generated'"
            ))
            col_exists = result.scalar() > 0
            if not col_exists:
                conn.execute(text(
                    "ALTER TABLE generated_quizzes "
                    "ADD COLUMN is_ai_generated TINYINT NOT NULL DEFAULT 1"
                ))
                print("✅ Column is_ai_generated added to generated_quizzes.")
            else:
                print("✅ Column is_ai_generated already exists, skipping.")
    except Exception as e:
        print(f"⚠️  Migration for is_ai_generated skipped: {e}")
    
    # Migration 2: Ensure refresh_tokens table exists
    try:
        with engine.begin() as conn:
            result = conn.execute(text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'refresh_tokens'"
            ))
            table_exists = result.scalar() > 0
            if not table_exists:
                conn.execute(text("""
                    CREATE TABLE refresh_tokens (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        token VARCHAR(512) NOT NULL UNIQUE,
                        user_id INT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        is_revoked TINYINT(1) NOT NULL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_token (token),
                        INDEX idx_user_id (user_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                print("✅ Table refresh_tokens created.")
            else:
                print("✅ Table refresh_tokens already exists, skipping.")
    except Exception as e:
        print(f"⚠️  Migration for refresh_tokens skipped: {e}")

    # Migration 3: Add agent_metadata column to messages
    try:
        with engine.begin() as conn:
            result = conn.execute(text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'messages' "
                "AND COLUMN_NAME = 'agent_metadata'"
            ))
            col_exists = result.scalar() > 0
            if not col_exists:
                conn.execute(text(
                    "ALTER TABLE messages "
                    "ADD COLUMN agent_metadata JSON NULL"
                ))
                print("✅ Column agent_metadata added to messages.")
            else:
                print("✅ Column agent_metadata already exists, skipping.")
    except Exception as e:
        print(f"⚠️  Migration for agent_metadata skipped: {e}")


#
# Dependency for FastAPI-style usage
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    # Simple CLI to create tables and optionally insert a sample user
    print("Initializing MySQL tables using:", MYSQL_URL)
    init_mysql()
    print("Tables created (if they did not exist).")
