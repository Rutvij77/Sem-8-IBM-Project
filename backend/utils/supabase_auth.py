from flask import request, current_app, jsonify
from db.supabase_client import get_supabase_client

def verify_token():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        supabase = get_supabase_client(current_app)

        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            return None, jsonify({"error": "Invalid token"}), 401

        return user_response.user, None, None

    except Exception:
        return None, jsonify({"error": "Invalid or expired token"}), 401
