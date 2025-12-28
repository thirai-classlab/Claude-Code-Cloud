"""
Unit Tests for Configuration
"""

from app.config import Settings


def test_settings_default_values():
    """Test that settings have default values"""
    settings = Settings(anthropic_api_key="test-key", redis_url="redis://localhost:6379")

    assert settings.redis_url == "redis://localhost:6379"
    assert settings.redis_db == 0
    assert settings.max_projects == 50
    assert settings.max_sessions_per_project == 20
    assert settings.session_timeout == 3600
    assert settings.default_model == "claude-opus-4-5"


def test_settings_cors_origins():
    """Test CORS origins parsing"""
    settings = Settings(
        anthropic_api_key="test-key",
        allowed_origins="http://localhost:3000,http://localhost:3001",
    )

    assert len(settings.cors_origins) == 2
    assert "http://localhost:3000" in settings.cors_origins
    assert "http://localhost:3001" in settings.cors_origins


def test_settings_sandbox_enabled():
    """Test sandbox mode detection"""
    settings_enabled = Settings(anthropic_api_key="test-key", sandbox_mode="enabled")
    settings_disabled = Settings(anthropic_api_key="test-key", sandbox_mode="disabled")

    assert settings_enabled.is_sandbox_enabled is True
    assert settings_disabled.is_sandbox_enabled is False
