import json
import subprocess
from pathlib import Path


def test_polycam_harness_passes_all_cases():
    repo_root = Path(__file__).resolve().parents[2]
    cmd = ["python3", "scripts/run_polycam_harness.py"]

    proc = subprocess.run(
        cmd,
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 0, f"Harness exited non-zero:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"

    payload = json.loads(proc.stdout)
    summary = payload.get("summary", {})

    assert summary.get("failed") == 0, f"Expected 0 failures, got: {summary}"
    assert summary.get("passed") == summary.get("total"), f"Expected all pass, got: {summary}"
