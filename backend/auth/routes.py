from flask import Blueprint, request, jsonify, current_app
from db.supabase_client import get_supabase_client
from utils.supabase_auth import verify_token
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────
# ─────────────────────────────────────────────
# 🔹 Register Profile After Signup (Unauthenticated)
# ─────────────────────────────────────────────
@auth_bp.route("/register-profile", methods=["POST"])
def register_profile():
    data = request.json
    user_id = data.get("user_id")
    username = data.get("username")
    email = data.get("email")

    if not user_id or not username or not email:
        return jsonify({"error": "Missing required fields"}), 400

    supabase = get_supabase_client(current_app)

    try:
        supabase.table("profiles").insert({
            "id": user_id,
            "username": username,
            "email": email,
            "role": "analyst",
            "is_active": True,  # Ensures the user is active upon signup
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return jsonify({"message": "Profile created successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Create Profile After Signup (Authenticated - Legacy/Fallback)
# ─────────────────────────────────────────────
@auth_bp.route("/create-profile", methods=["POST"])
def create_profile():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    data = request.json
    username = data.get("username")
    email = data.get("email")

    if not username:
        return jsonify({"error": "Username required"}), 400

    supabase = get_supabase_client(current_app)

    try:
        supabase.table("profiles").insert({
            "id": user_id,
            "username": username,
            "email": email,
            "role": "analyst",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return jsonify({"message": "Profile created successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Get Current Logged-in User
# ─────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)

    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Record Login Session
# ─────────────────────────────────────────────
@auth_bp.route("/record-login", methods=["POST"])
def record_login():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    data = request.json or {}
    supabase = get_supabase_client(current_app)

    try:
        supabase.table("login_sessions").insert({
            "user_id": user_id,
            "email": data.get("email", ""),
            "ip_address": data.get("ip_address", ""),
            "user_agent": data.get("user_agent", ""),
            "login_time": datetime.utcnow().isoformat()
        }).execute()

        return jsonify({"message": "Login session recorded"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔐 ADMIN HELPER
# ─────────────────────────────────────────────
def require_admin(payload):
    """Returns error tuple (response, status) if not admin, else None."""
    supabase = get_supabase_client(current_app)
    profile = supabase.table("profiles").select("role").eq("id", payload.id).execute()
    if not profile.data:
        return jsonify({"error": "Profile not found"}), 403
    if profile.data[0].get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ─────────────────────────────────────────────
# 🔹 Get All Users (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/users", methods=["GET"])
def get_all_users():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    supabase = get_supabase_client(current_app)

    try:
        response = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Invite New User (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/users", methods=["POST"])
def admin_create_user():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    data = request.json
    email = data.get("email")
    username = data.get("username")
    role = data.get("role", "analyst")

    if not email or not username:
        return jsonify({"error": "Missing required fields"}), 400

    supabase = get_supabase_client(current_app)

    try:
        # Use invite_user_by_email to send an invite link where they can set their password
        # It redirects them to the new update-password page
        auth_response = supabase.auth.admin.invite_user_by_email(
            email, 
            options={"redirect_to": "https://vehicle-intelligence-platform.vercel.app/update-password"}
        )

        if not auth_response.user:
            return jsonify({"error": "User invitation failed in Auth"}), 500

        new_user_id = auth_response.user.id

        # Insert into profiles table
        supabase.table("profiles").insert({
            "id": new_user_id,
            "username": username,
            "email": email,
            "role": role,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return jsonify({"message": "User invited successfully. An email has been sent to them to set their password."}), 201

    except Exception as e:
        return jsonify({"error": f"Error creating user: {str(e)}"}), 500



# ─────────────────────────────────────────────
# 🔹 Change User Role (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/users/<user_id>/role", methods=["PATCH"])
def change_user_role(user_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    data = request.json
    new_role = data.get("role")

    if new_role not in ["analyst", "admin"]:
        return jsonify({"error": "Invalid role. Must be 'analyst' or 'admin'"}), 400

    supabase = get_supabase_client(current_app)

    try:
        supabase.table("profiles").update({"role": new_role}).eq("id", user_id).execute()
        return jsonify({"message": f"User role updated to {new_role}"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Activate / Deactivate User (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/users/<user_id>/status", methods=["PATCH"])
def change_user_status(user_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    data = request.json
    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        return jsonify({"error": "is_active must be a boolean"}), 400

    supabase = get_supabase_client(current_app)

    try:
        supabase.table("profiles").update({"is_active": is_active}).eq("id", user_id).execute()
        status_str = "activated" if is_active else "deactivated"
        return jsonify({"message": f"User {status_str} successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Delete User (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    supabase = get_supabase_client(current_app)

    try:
        # Delete from profiles manually in case CASCADE is not set up
        supabase.table("profiles").delete().eq("id", user_id).execute()
        
        # Permanently delete from Supabase Authentication
        supabase.auth.admin.delete_user(user_id)
        
        return jsonify({"message": "User deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Get All Login Sessions (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/login-sessions", methods=["GET"])
def get_login_sessions():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    supabase = get_supabase_client(current_app)

    try:
        response = (
            supabase.table("login_sessions")
            .select("*, profiles(username, email)")
            .order("login_time", desc=True)
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 Get Analyst History (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/analyst-history", methods=["GET"])
def get_analyst_history():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    supabase = get_supabase_client(current_app)

    try:
        response = (
            supabase.table("analysis_history")
            .select("*, profiles(username, email)")
            .order("created_at", desc=True)
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────────
# 🔹 Get Admin Stats (Admin)
# ─────────────────────────────────────────────
@auth_bp.route("/admin-stats", methods=["GET"])
def get_admin_stats():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    err = require_admin(payload)
    if err:
        return err

    supabase = get_supabase_client(current_app)

    try:
        users_res = supabase.table("profiles").select("role").execute()
        history_res = supabase.table("analysis_history").select("id").execute()

        users = users_res.data
        total_users = len(users)
        admins = sum(1 for u in users if u.get("role") == "admin")
        analysts = sum(1 for u in users if u.get("role") == "analyst")
        analyses_run = len(history_res.data) if history_res.data else 0

        return jsonify({
            "total_users": total_users,
            "admins": admins,
            "analysts": analysts,
            "analyses_run": analyses_run
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
