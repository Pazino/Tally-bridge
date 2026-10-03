import os
import sys
import time
import socket
import threading
import uvicorn
import webview
from backend import app, APP_VERSION

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_ICO = os.path.join(APP_DIR, "app_icon.ico")
ICON_PNG = os.path.join(APP_DIR, "app_icon.png")

PORT = 19876

def is_port_in_use(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def start_backend():
    # Configure uvicorn server with disabled signal handlers for thread safety
    config = uvicorn.Config(app=app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    server.run()

def kill_port_owner(port):
    try:
        import subprocess
        out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
        for line in out.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1]:
                pid = int(parts[-1])
                if pid != os.getpid() and pid > 0:
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
    except Exception:
        pass

def main():
    if is_port_in_use(PORT):
        kill_port_owner(PORT)
        time.sleep(0.3)

    t = threading.Thread(target=start_backend, daemon=True)
    t.start()

    # Wait up to 5 seconds for backend to become active
    for _ in range(50):
        if is_port_in_use(PORT):
            break
        time.sleep(0.1)

    url = f"http://127.0.0.1:{PORT}"

    # Create Modern PyWebView Window
    window = webview.create_window(
        title=f"Tally Bridge v{APP_VERSION} • SYNC • PROCESS • VISUALISE",
        url=url,
        width=1360,
        height=920,
        min_size=(1120, 720),
        background_color="#090d13",
        text_select=True
    )
    
    # Run GUI loop
    webview.start(debug=False, icon=ICON_ICO if os.path.exists(ICON_ICO) else None)

if __name__ == "__main__":
    main()
