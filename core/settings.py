import firebase_admin
from firebase_admin import credentials, auth, firestore
import json
import os

def initialize_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")

    if not service_account_json:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT não configurado")

    # Pode ser JSON ou base64
    try:
        service_account_info = json.loads(service_account_json)
    except json.JSONDecodeError:
        import base64
        decoded = base64.b64decode(service_account_json).decode()
        service_account_info = json.loads(decoded)

    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)

    return firebase_admin.get_app()

def get_firestore():
    initialize_firebase()
    return firestore.client()

def verify_token(id_token):
    initialize_firebase()
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception:
        return None
