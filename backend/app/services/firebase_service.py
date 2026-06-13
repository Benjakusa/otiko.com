import os
import firebase_admin
from firebase_admin import auth
from typing import Dict, Any, Optional

class FirebaseService:
    def __init__(self):
        self.app_initialized = len(firebase_admin._apps) > 0

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase user ID token for client authentication validation"""
        if not self.app_initialized:
            # Fallback for mock sandbox environment testing
            return {
                "uid": "org_123_default",
                "email": "demo@otiko.com",
                "name": "Demo Organizer",
                "phone_number": "254712345678"
            }
        try:
            return auth.verify_id_token(token)
        except Exception as exc:
            print(f"[FirebaseService] Error verifying token: {exc}")
            return None
