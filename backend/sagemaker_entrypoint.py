"""SageMaker appends `serve` to the image ENTRYPOINT."""
import os
import sys

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] != "serve":
        raise SystemExit("This image supports inference (`serve`) only")
    os.execvp("uvicorn", ["uvicorn", "app.sagemaker_worker:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"])
