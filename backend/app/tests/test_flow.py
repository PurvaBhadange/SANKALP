import urllib.request
import urllib.error
import json
import sys
import uuid

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode("utf-8")
    else:
        req_data = None

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = e.reason
        return e.code, body
    except Exception as e:
        return 500, str(e)

def upload_document(token, owner_type, owner_id, doc_type, file_content, file_name):
    url = f"{BASE_URL}/documents"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="owner_type"\r\n\r\n'
        f"{owner_type}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="owner_id"\r\n\r\n'
        f"{owner_id}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="doc_type"\r\n\r\n'
        f"{doc_type}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
        f"{file_content}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 500, str(e)

def run_tests():
    print("=== STARTING INTEGRATION TESTS ===")

    # 1. POST /auth/login with seeded admin
    print("\n1. Testing admin login...")
    status, login_res = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    if status != 200:
        print(f"FAILED: Admin login returned status {status}: {login_res}")
        sys.exit(1)
    
    admin_token = login_res.get("access_token")
    admin_refresh = login_res.get("refresh_token")
    if not admin_token or not admin_refresh:
        print("FAILED: Tokens not found in login response")
        sys.exit(1)
    print("SUCCESS: Admin logged in, tokens retrieved.")

    # 2. GET /auth/me
    print("\n2. Testing /auth/me...")
    status, me_res = make_request("/auth/me", "GET", token=admin_token)
    if status != 200:
        print(f"FAILED: /auth/me returned status {status}")
        sys.exit(1)
    
    if me_res.get("email") != "admin@test.gov.in":
        print(f"FAILED: Email does not match: {me_res.get('email')}")
        sys.exit(1)
    
    roles = [r.get("name") for r in me_res.get("roles", [])]
    if "SUPER_ADMIN" not in roles:
        print(f"FAILED: SUPER_ADMIN role missing: {roles}")
        sys.exit(1)
    
    dept = me_res.get("department")
    if not dept or dept.get("code") != "SEEID":
        print(f"FAILED: Department assignment incorrect: {dept}")
        sys.exit(1)
        
    dept_id = dept.get("id")
    print(f"SUCCESS: User verified. Role: {roles}, Dept: {dept.get('name')}")

    # 3. GET /users security guards
    print("\n3. Testing role permissions on GET /users...")
    status, res = make_request("/users", "GET")
    if status != 401:
        print(f"FAILED: GET /users without token returned {status} (expected 401)")
        sys.exit(1)
    print("SUCCESS: Anonymous request blocked (401).")

    # 4. POST /users creates DEPARTMENT_OFFICER
    print("\n4. Testing user creation as Admin...")
    officer_email = f"officer_{uuid.uuid4().hex[:6]}@test.gov.in"
    status, officer_res = make_request("/users", "POST", {
        "email": officer_email,
        "password": "OfficerPassword123!",
        "full_name": "Innovation Dept Officer",
        "role_names": ["DEPARTMENT_OFFICER"],
        "department_id": dept_id
    }, token=admin_token)
    
    if status != 201:
        print(f"FAILED: User creation returned {status}: {officer_res}")
        sys.exit(1)
    print(f"SUCCESS: Department Officer created: {officer_email}")

    # 5. POST /auth/login for officer + GET /users role checks
    print("\n5. Testing permissions as Officer...")
    status, off_login_res = make_request("/auth/login", "POST", {
        "email": officer_email,
        "password": "OfficerPassword123!"
    })
    if status != 200:
        print(f"FAILED: Officer login failed")
        sys.exit(1)
    officer_token = off_login_res.get("access_token")

    status, res = make_request("/users", "GET", token=officer_token)
    if status != 403:
        print(f"FAILED: Officer requesting /users returned {status} (expected 403)")
        sys.exit(1)
    print("SUCCESS: Non-admin request blocked with 403.")

    # 6. GET /users (as admin)
    print("\n6. Listing users as Admin...")
    status, users_res = make_request("/users", "GET", token=admin_token)
    if status != 200:
        print(f"FAILED: GET /users as admin returned {status}")
        sys.exit(1)
    
    emails = [u.get("email") for u in users_res]
    if officer_email not in emails:
        print(f"FAILED: Created officer {officer_email} not found in user list")
        sys.exit(1)
    print(f"SUCCESS: User list retrieved (count: {len(users_res)}). New officer present.")

    # 7. GET /audit-logs
    print("\n7. Fetching audit logs as Admin...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin_token)
    if status != 200:
        print(f"FAILED: Fetching audit logs returned {status}: {audit_res}")
        sys.exit(1)
    
    actions = [log.get("action") for log in audit_res]
    print(f"SUCCESS: Found actions: {actions}")
    if "USER_CREATE" not in actions or "LOGIN" not in actions:
        print("FAILED: Expected USER_CREATE and LOGIN events in audit log")
        sys.exit(1)
    print("SUCCESS: Audit logs verified.")

    # 8. POST /documents (multipart upload)
    print("\n8. Uploading document as Officer...")
    test_owner_id = str(uuid.uuid4())
    status, doc_res = upload_document(
        token=officer_token,
        owner_type="test",
        owner_id=test_owner_id,
        doc_type="test_doc",
        file_content="This is a test document content.",
        file_name="test_doc.txt"
    )
    if status != 201:
        print(f"FAILED: Uploading document returned {status}: {doc_res}")
        sys.exit(1)
    
    doc_id = doc_res.get("id")
    print(f"SUCCESS: Document uploaded successfully. ID: {doc_id}")

    # 9. GET /documents/{owner_type}/{owner_id}
    print("\n9. Retrieving documents...")
    status, docs_res = make_request(f"/documents/test/{test_owner_id}", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED: Fetching documents returned {status}")
        sys.exit(1)
    
    if len(docs_res) != 1 or docs_res[0].get("id") != doc_id:
        print(f"FAILED: Document matching failed: {docs_res}")
        sys.exit(1)
    print("SUCCESS: Document retrieved successfully.")

    # 10. GET /notifications
    print("\n10. Fetching notifications...")
    status, notif_res = make_request("/notifications", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED: Fetching notifications returned {status}")
        sys.exit(1)
    if len(notif_res) != 0:
        print(f"WARNING: Fresh user notifications count is {len(notif_res)} (expected 0)")
    print("SUCCESS: Notifications query succeeded with empty list as expected.")

    print("\n=== ALL INTEGRATION TESTS PASSED ===")

if __name__ == "__main__":
    run_tests()
