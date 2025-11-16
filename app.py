"""
ICMP Ping Web Server
Endpoint: GET /ping?host=11.22.33.44
- Success (>=1/2 packets): 200 OK
- Failure (=0 packets): 500 Internal Server Error
- Basic Auth: username/password from ENV
"""

import os
import re
import subprocess
from typing import Tuple, Optional
from flask import Flask, request, Response
from functools import wraps

app = Flask(__name__)

# ==================== CONFIG ====================
PING_COUNT = 2
MIN_SUCCESS_PACKETS = 1

# Lấy Basic Auth từ ENV
AUTH_USERNAME = os.getenv("BASIC_AUTH_USER", "admin")
AUTH_PASSWORD = os.getenv("BASIC_AUTH_PASS", "Secr3t@123")
# Enable or disable Basic Auth via environment variable. Set to 0/false to disable.
AUTH_ENABLED = os.getenv("BASIC_AUTH_ENABLED", "1").lower() in ("1", "true", "yes", "on")

# Regex kiểm tra IP hợp lệ
IP_REGEX = re.compile(
    r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}"
    r"(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
)

# ==================== AUTH DECORATOR ====================
def require_basic_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # If auth is disabled via env, skip authentication.
        if not AUTH_ENABLED:
            return f(*args, **kwargs)
        auth = request.authorization
        if not auth or not (auth.username == AUTH_USERNAME and auth.password == AUTH_PASSWORD):
            return Response(
                "Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="Ping Server"'}
            )
        return f(*args, **kwargs)
    return decorated

# ==================== CORE LOGIC ====================
def is_valid_ip(ip: str) -> bool:
    """Kiểm tra IP có hợp lệ không"""
    return bool(IP_REGEX.match(ip))

def ping_host(ip: str) -> Tuple[bool, str]:
    """
    Thực hiện ping ICMP
    Trả về: (is_success: bool, output: str)
    """
    param = "-n" if os.name == "nt" else "-c"
    command = ["ping", param, str(PING_COUNT), ip]

    try:
        output = subprocess.check_output(
            command,
            stderr=subprocess.STDOUT,
            timeout=5,
            text=True
        )
        # Đếm số packet received
        received = output.lower().count("received")
        if "received" not in output:
            # Windows: "Received = 4"
            match = re.search(r"Received\s*=\s*(\d+)", output, re.I)
            received = int(match.group(1)) if match else 0
        else:
            # Linux: "4 received"
            match = re.search(r"(\d+)\s+received", output, re.I)
            received = int(match.group(1)) if match else 0

        success = received >= MIN_SUCCESS_PACKETS
        return success, output

    except subprocess.TimeoutExpired:
        return False, f"Ping timeout sau 5s cho {ip}"
    except subprocess.CalledProcessError as e:
        return False, f"Ping thất bại: {e.output}"
    except Exception as e:
        return False, f"Lỗi không xác định: {str(e)}"

# ==================== ROUTE ====================
@app.route("/ping", methods=["GET"])
@require_basic_auth
def ping():
    host = request.args.get("host", "").strip()
    
    if not host:
        return Response("Thiếu tham số 'host'", 400)
    
    if not is_valid_ip(host):
        return Response("IP không hợp lệ", 400)

    success, output = ping_host(host)

    status_code = 200 if success else 500
    return Response(output, status=status_code, mimetype="text/plain")

# ==================== HEALTH CHECK ====================
@app.route("/health", methods=["GET"])
def health():
    return "OK", 200

# ==================== MAIN ====================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)