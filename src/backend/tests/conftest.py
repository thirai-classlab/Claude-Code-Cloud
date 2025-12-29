"""
Pytest Configuration and Fixtures
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """FastAPI TestClient fixture"""
    return TestClient(app)


@pytest.fixture
def sample_project_data():
    """Sample project data for testing"""
    return {
        "name": "Test Project",
        "description": "A test project",
        "user_id": "test-user-123",
    }


@pytest.fixture
def sample_session_data():
    """Sample session data for testing"""
    return {
        "project_id": "test-project-123",
        "name": "Test Session",
        "user_id": "test-user-123",
        "model": "claude-opus-4-5",
    }
