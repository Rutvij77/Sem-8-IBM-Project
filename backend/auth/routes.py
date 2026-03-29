from flask import Blueprint, request, jsonify, current_app
from db.supabase_client import get_supabase_client
from utils.supabase_auth import verify_token
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


# 🔹 Create Profile After Signup
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
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return jsonify({"message": "Profile created successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 🔹 Get Current Logged-in User
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



# from flask import Blueprint, request, jsonify, current_app
# from utils.appid import signup_appid, login_appid
# from db.cloudant import init_cloudant
# from datetime import datetime, timezone

# auth_bp = Blueprint("auth", __name__)

# @auth_bp.route("/signup", methods=["POST"])
# def signup():
#     data = request.json
#     username = data.get("username")
#     email = data.get("email")
#     password = data.get("password")

#     if not all([username, email, password]):
#         return jsonify({"error": "Missing fields"}), 400

#     # 1️⃣ Create user in App ID
#     appid_res, status = signup_appid(email, password, current_app.config)
#     if status != 201:
#         return jsonify(appid_res), status
    
#     user_id = appid_res["id"]

#     client = init_cloudant(current_app)
#     db_name = current_app.config["CLOUDANT_DB_NAME"]

#     user_doc = {
#         "appid": user_id,
#         "username": username,
#         "email": email,
#         "createdAt": datetime.now(timezone.utc).isoformat()
#     }

#     try:
#         client.post_document(db=db_name, document=user_doc).get_result()
#         return jsonify({"message": "User registered successfully", "user_id": user_id}), 201
#     except Exception as e:
#         return jsonify({"error": "Cloudant storage failed", "details": str(e)}), 500
    
# @auth_bp.route("/login", methods=["POST"])
# def login():
#     data = request.json
#     email = data.get("email")
#     password = data.get("password")

#     if not all([email, password]):
#         return jsonify({"error": "Missing email or password"}), 400

#     # 1️⃣ Authenticate with App ID
#     appid_res, status = login_appid(email, password, current_app.config)

#     if status != 200:
#         error_description = appid_res.get("error_description", "")

#         if "email" in error_description.lower():
#             return jsonify({
#                 "error": "Email not verified. Please check your inbox and verify your email before logging in."
#             }), 403

#         return jsonify({"error": "Invalid email or password"}), 401

#     # 2️⃣ Extract useful data
#     client = init_cloudant(current_app)
#     db_name = current_app.config["CLOUDANT_DB_NAME"]

#     query = {
#         "selector": {
#             "email": email
#         }
#     }

#     result = client.post_find(db=db_name, selector=query["selector"]).get_result()

#     docs = result.get("docs", [])
#     username = docs[0]["username"] if docs else None

#     access_token = appid_res.get("access_token")
#     id_token = appid_res.get("id_token")

#     return jsonify({
#         "message": "Login successful",
#         "user": {
#             "email": email,
#             "username": username    
#         },
#         "access_token": access_token,
#         "id_token": id_token
#     }), 200

# @auth_bp.route("/users", methods=["GET"])
# def get_users():
#     try:
#         client = init_cloudant(current_app)
#         db_name = current_app.config["CLOUDANT_DB_NAME"]

#         # Fetch documents
#         response = client.post_all_docs(
#             db=db_name,
#             include_docs=True
#         ).get_result()

#         docs = [
#             row["doc"]
#             for row in response.get("rows", [])
#             if "doc" in row
#         ]

#         return jsonify({
#             "count": len(docs),
#             "data": docs
#         }), 200

#     except Exception as e:
#         return jsonify({
#             "error": "Failed to fetch data from Cloudant",
#             "details": str(e)
#         }), 500


