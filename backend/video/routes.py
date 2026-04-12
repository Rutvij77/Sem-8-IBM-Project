# from flask import Blueprint, request, jsonify, current_app
# import cloudinary
# import cloudinary.uploader

# video_bp = Blueprint("video", __name__)

# @video_bp.route("/upload", methods=["POST"])
# def upload_video():
#     if "video" not in request.files:
#         return jsonify({"error": "No video file provided"}), 400

#     video = request.files["video"]

#     cloudinary.config(
#         cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
#         api_key=current_app.config["CLOUDINARY_API_KEY"],
#         api_secret=current_app.config["CLOUDINARY_API_SECRET"]
#     )

#     try:
#         result = cloudinary.uploader.upload(
#             video,
#             resource_type="video",
#             folder="traffic_videos"
#         )

#         return jsonify({
#             "message": "Upload successful",
#             "video_url": result["secure_url"],
#             "public_id": result["public_id"]
#         }), 200

#     except Exception as e:
#         return jsonify({
#             "error": "Upload failed",
#             "details": str(e)
#         }), 500


from flask import Blueprint, request, jsonify, current_app
import cloudinary
import cloudinary.uploader
from db.supabase_client import get_supabase_client
from utils.supabase_auth import verify_token

video_bp = Blueprint("video", __name__)

@video_bp.route("/upload", methods=["POST"])
def upload_video():
    # Verify user token
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id

    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video = request.files["video"]

    cloudinary.config(
        cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=current_app.config["CLOUDINARY_API_KEY"],
        api_secret=current_app.config["CLOUDINARY_API_SECRET"]
    )

    try:
        result = cloudinary.uploader.upload(
            video,
            resource_type="video",
            folder="traffic_videos"
        )

        video_url = result["secure_url"]
        public_id = result["public_id"]

        return jsonify({
            "message": "Upload successful",
            "video_url": video_url,
            "public_id": public_id,
            "user_id": user_id
        }), 200

    except Exception as e:
        print("Process video error:", str(e))
        return jsonify({
            "error": "Upload failed",
            "details": str(e)
        }), 500


@video_bp.route("/process", methods=["POST"])
def process_video():
    # Verify user token
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id

    # Get video_url, file_name and processing_duration from request body
    data = request.get_json()
    if not data or "video_url" not in data:
        return jsonify({"error": "video_url is required"}), 400

    video_url = data["video_url"]
    file_name = data.get("file_name", "unknown")
    processing_duration = data.get("processing_duration", None)

    try:
        supabase = get_supabase_client(current_app)

        import requests as req
        colab_url = current_app.config.get("COLAB_MODEL_URL")

        if not colab_url:
            return jsonify({"error": "Model URL not configured"}), 500

        # Send video_url to Colab model
        model_response = req.post(
            f"{colab_url}/predict",
            json={"video_url": video_url},
            timeout=600  # 5 minutes timeout for processing
        )

        if model_response.status_code != 200:
            return jsonify({"error": "Model processing failed"}), 500

        model_data = model_response.json()
        vehicle_rows = model_data.get("vehicle_data", [])

        if not vehicle_rows:
            return jsonify({"error": "No vehicle data returned from model"}), 500

        # Add user_id to each row
        for row in vehicle_rows:
            row["user_id"] = user_id

        # Delete old vehicle_data for this user, then re-insert latest
        supabase.table("vehicle_data").delete().eq("user_id", user_id).execute()
        print(f"Old data deleted for user: {user_id}")

        # Store all rows in Supabase
        supabase.table("vehicle_data").insert(vehicle_rows).execute()

        # Get annotated video url from model response
        annotated_video_url = model_data.get("annotated_video_url", "")

        # ── Build analysis_history summary ─────────────────────
        type_counts = {"car": 0, "motorcycle": 0, "truck": 0, "bus": 0}
        for row in vehicle_rows:
            vtype = row.get("vehicle_type", "").lower()
            if vtype in type_counts:
                type_counts[vtype] += 1

        # Use processing_duration from model response if not sent by frontend
        if processing_duration is None:
            processing_duration = model_data.get("processing_duration", None)

        supabase.table("analysis_history").insert({
            "user_id": user_id,
            "file_name": file_name,
            "total_vehicles": len(vehicle_rows),
            "cars": type_counts["car"],
            "motorcycles": type_counts["motorcycle"],
            "trucks": type_counts["truck"],
            "buses": type_counts["bus"],
            "processing_duration": processing_duration,
            "annotated_video_url": annotated_video_url,
        }).execute()

        print(f"Analysis history recorded for user: {user_id}")

        return jsonify({
            "message": "Video processed and data stored successfully",
            "total_rows": len(vehicle_rows),
            "annotated_video_url": annotated_video_url
        }), 200

    except Exception as e:
        print("Process video error:", str(e))
        return jsonify({
            "error": "Processing failed",
            "details": str(e)
        }), 500
    
@video_bp.route("/delete", methods=["POST"])
def delete_videos():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    data = request.get_json()
    public_ids = data.get("public_ids", [])

    if not public_ids:
        return jsonify({"error": "No public_ids provided"}), 400

    cloudinary.config(
        cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=current_app.config["CLOUDINARY_API_KEY"],
        api_secret=current_app.config["CLOUDINARY_API_SECRET"]
    )

    try:
        for public_id in public_ids:
            cloudinary.uploader.destroy(public_id, resource_type="video")
            print(f"Deleted from Cloudinary: {public_id}")

        return jsonify({"message": "Videos deleted successfully"}), 200

    except Exception as e:
        print("Delete error:", str(e))
        return jsonify({"error": str(e)}), 500