"""
DinD (Docker-in-Docker) Executor for Agent SDK

This module provides utilities to execute code in isolated Docker containers
using the DinD service, with shared workspace access.
"""

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Union
import logging

logger = logging.getLogger(__name__)


class DindExecutor:
    """Execute code in Docker containers via DinD service."""

    def __init__(
        self,
        docker_host: Optional[str] = None,
        workspace_path: Optional[str] = None,
        dind_workspace_path: Optional[str] = None,
    ):
        """
        Initialize DinD executor.

        Args:
            docker_host: Docker host URL (e.g., tcp://dind:2375)
            workspace_path: Local workspace path in backend container
            dind_workspace_path: Workspace path inside DinD container
        """
        self.docker_host = docker_host or os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
        self.workspace_path = workspace_path or os.getenv("WORKSPACE_PATH", "/app/workspace")
        self.dind_workspace_path = dind_workspace_path or os.getenv("DIND_WORKSPACE_PATH", "/workspaces")
        self.dind_enabled = os.getenv("DIND_ENABLED", "false").lower() == "true"

        logger.info(f"DinD Executor initialized: enabled={self.dind_enabled}, host={self.docker_host}")

    def is_available(self) -> bool:
        """Check if DinD is available and accessible."""
        if not self.dind_enabled:
            return False

        try:
            result = subprocess.run(
                ["docker", "info"],
                env={"DOCKER_HOST": self.docker_host},
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.warning("DinD service not available")
            return False

    def run_command(
        self,
        image: str,
        command: Union[str, List[str]],
        working_dir: Optional[str] = None,
        env_vars: Optional[Dict[str, str]] = None,
        timeout: int = 300,
        mount_workspace: bool = True,
    ) -> Dict[str, Union[int, str]]:
        """
        Run a command in a Docker container via DinD.

        Args:
            image: Docker image to use (e.g., "python:3.11")
            command: Command to execute (string or list)
            working_dir: Working directory inside container
            env_vars: Environment variables
            timeout: Execution timeout in seconds
            mount_workspace: Whether to mount workspace volume

        Returns:
            Dict with 'returncode', 'stdout', 'stderr'
        """
        if not self.is_available():
            raise RuntimeError("DinD service is not available")

        # Build docker run command
        docker_cmd = ["docker", "run", "--rm"]

        # Mount workspace if requested
        if mount_workspace:
            docker_cmd.extend(["-v", f"{self.dind_workspace_path}:{self.dind_workspace_path}"])

        # Set working directory
        if working_dir:
            docker_cmd.extend(["-w", working_dir])
        elif mount_workspace:
            docker_cmd.extend(["-w", self.dind_workspace_path])

        # Add environment variables
        if env_vars:
            for key, value in env_vars.items():
                docker_cmd.extend(["-e", f"{key}={value}"])

        # Add image
        docker_cmd.append(image)

        # Add command
        if isinstance(command, str):
            docker_cmd.extend(["/bin/sh", "-c", command])
        else:
            docker_cmd.extend(command)

        # Execute
        try:
            logger.info(f"Executing in DinD: {' '.join(docker_cmd)}")
            result = subprocess.run(
                docker_cmd,
                env={"DOCKER_HOST": self.docker_host},
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out after {timeout}s")
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
            }
        except Exception as e:
            logger.error(f"Error executing command: {e}")
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": str(e),
            }

    def run_python_code(
        self,
        code: str,
        python_version: str = "3.11",
        requirements: Optional[List[str]] = None,
        timeout: int = 300,
    ) -> Dict[str, Union[int, str]]:
        """
        Execute Python code in isolated container.

        Args:
            code: Python code to execute
            python_version: Python version (e.g., "3.11")
            requirements: List of pip packages to install
            timeout: Execution timeout in seconds

        Returns:
            Dict with 'returncode', 'stdout', 'stderr'
        """
        # Create temporary script
        script_content = code

        # If requirements specified, install them first
        if requirements:
            install_cmd = f"pip install --quiet {' '.join(requirements)} && "
        else:
            install_cmd = ""

        # Build command
        command = f"{install_cmd}python3 -c {repr(code)}"

        return self.run_command(
            image=f"python:{python_version}-slim",
            command=command,
            timeout=timeout,
        )

    def run_shell_script(
        self,
        script: str,
        shell: str = "/bin/bash",
        timeout: int = 300,
    ) -> Dict[str, Union[int, str]]:
        """
        Execute shell script in isolated container.

        Args:
            script: Shell script content
            shell: Shell to use (default: /bin/bash)
            timeout: Execution timeout in seconds

        Returns:
            Dict with 'returncode', 'stdout', 'stderr'
        """
        return self.run_command(
            image="ubuntu:22.04",
            command=[shell, "-c", script],
            timeout=timeout,
        )

    def build_and_run(
        self,
        dockerfile_content: str,
        command: Optional[Union[str, List[str]]] = None,
        context_path: Optional[str] = None,
        timeout: int = 600,
    ) -> Dict[str, Union[int, str]]:
        """
        Build a Docker image from Dockerfile content and run it.

        Args:
            dockerfile_content: Content of Dockerfile
            command: Command to run (optional, uses CMD from Dockerfile if not provided)
            context_path: Build context path (relative to workspace)
            timeout: Total timeout in seconds

        Returns:
            Dict with 'returncode', 'stdout', 'stderr'
        """
        if not self.is_available():
            raise RuntimeError("DinD service is not available")

        try:
            # Create temporary Dockerfile in workspace
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.Dockerfile',
                dir=self.workspace_path,
                delete=False,
            ) as f:
                f.write(dockerfile_content)
                dockerfile_path = f.name

            # Generate unique image tag
            import uuid
            image_tag = f"dind-build-{uuid.uuid4().hex[:8]}"

            # Build image
            build_cmd = [
                "docker", "build",
                "-f", dockerfile_path,
                "-t", image_tag,
            ]

            if context_path:
                build_cmd.append(os.path.join(self.dind_workspace_path, context_path))
            else:
                build_cmd.append(self.dind_workspace_path)

            logger.info(f"Building image: {' '.join(build_cmd)}")
            build_result = subprocess.run(
                build_cmd,
                env={"DOCKER_HOST": self.docker_host},
                capture_output=True,
                text=True,
                timeout=timeout // 2,
            )

            if build_result.returncode != 0:
                return {
                    "returncode": build_result.returncode,
                    "stdout": build_result.stdout,
                    "stderr": f"Build failed: {build_result.stderr}",
                }

            # Run container
            run_result = self.run_command(
                image=image_tag,
                command=command or [],
                timeout=timeout // 2,
            )

            # Cleanup image
            subprocess.run(
                ["docker", "rmi", image_tag],
                env={"DOCKER_HOST": self.docker_host},
                capture_output=True,
            )

            # Cleanup Dockerfile
            try:
                os.unlink(dockerfile_path)
            except:
                pass

            return run_result

        except Exception as e:
            logger.error(f"Error in build_and_run: {e}")
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": str(e),
            }


# Singleton instance
_executor: Optional[DindExecutor] = None


def get_executor() -> DindExecutor:
    """Get or create DinD executor singleton."""
    global _executor
    if _executor is None:
        _executor = DindExecutor()
    return _executor
