"""
Integration Tests for Health Check
"""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test health check endpoint"""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "timestamp" in data


def test_root_endpoint(client: TestClient):
    """Test root endpoint"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Claude Code Backend"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"
