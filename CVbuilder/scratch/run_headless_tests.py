import http.server
import socketserver
import threading
import subprocess
import json
import os
import sys
import time

PORT = 8981

class TestServerHandler(http.server.SimpleHTTPRequestHandler):
    pass

    def do_POST(self):
        if self.path == '/report':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            report = json.loads(post_data.decode('utf-8'))
            print("=== TEST REPORT RECEIVED ===")
            print(f"Total Tests: {report['statistics']['totalTests']}")
            print(f"Passed: {report['statistics']['passed']}")
            print(f"Failed: {report['statistics']['failed']}")
            print(f"Success Rate: {report['statistics']['successRate']}")
            
            failed_tests = [t for t in report['assertions'] if not t['passed']]
            if failed_tests:
                print("\nFAILED TESTS:")
                for t in failed_tests:
                    print(f" - {t['id']}: {t['name']}")
                    print(f"   Expected: {t['expected']}")
                    print(f"   Actual: {t['actual']}")
            else:
                print("\nALL TESTS PASSED!")
            
            # Write report to file
            with open("test_report.json", "w") as f:
                json.dump(report, f, indent=2)
            
            # Send response and shutdown server
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
            
            # Shutdown server
            threading.Thread(target=self.server.shutdown).start()
            return
            
        super().do_POST()

def run():
    # Change directory to project root
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)
    
    server = socketserver.TCPServer(("", PORT), TestServerHandler)
    
    # Start Edge headlessly
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    # Start server in a thread
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    
    print(f"Server started on port {PORT}. Launching Edge headless...")
    
    # Start Edge process
    edge_proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        "--disable-gpu",
        f"http://localhost:{PORT}/test_logic.html"
    ])
    
    # Wait for server to shutdown (which happens when report is received)
    server_thread.join(timeout=30)
    
    # Clean up Edge
    edge_proc.terminate()
    try:
        edge_proc.wait(timeout=2)
    except:
        edge_proc.kill()
        
    print("Test run execution script finished.")

if __name__ == '__main__':
    run()
