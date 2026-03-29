from flask import Blueprint, request, jsonify, current_app
import cloudinary
import cloudinary.uploader

video_bp = Blueprint("video", __name__)

@video_bp.route("/upload", methods=["POST"])
def upload_video():
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

        return jsonify({
            "message": "Upload successful",
            "video_url": result["secure_url"],
            "public_id": result["public_id"]
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Upload failed",
            "details": str(e)
        }), 500
