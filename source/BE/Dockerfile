FROM python:3.11-slim

# Install system dependencies for document processing + curl for health checks
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-vie \
    tesseract-ocr-eng \
    libmagic1 \
    libreoffice \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pip: slower networks / large wheels (docling, etc.) need longer timeouts
ENV PIP_DEFAULT_TIMEOUT=600
RUN pip install --upgrade pip && pip install --no-cache-dir --retries 15 wheel setuptools

# Layer 1a: PyTorch CPU from official index only (avoids multi-GB CUDA wheels from PyPI)
RUN pip install --no-cache-dir --retries 15 \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# Layer 1b: remaining heavy deps (torch already satisfied → no CUDA reinstall)
COPY requirements-heavy.txt .
RUN pip install --no-cache-dir --retries 15 -r requirements-heavy.txt

# Layer 2: requirements thường
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: code
COPY . .

RUN mkdir -p /app/uploads

EXPOSE 8000

# Disable Python buffering for immediate log output
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]