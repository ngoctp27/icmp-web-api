FROM python:3.12-slim

# Cài đặt iputils-ping (cần cho lệnh ping)
RUN apt-get update && apt-get install -y iputils-ping && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

# Cần quyền NET_RAW để ping
CMD ["python", "app.py"]