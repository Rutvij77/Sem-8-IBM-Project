from flask import Flask
from flask_cors import CORS
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    from auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from video.routes import video_bp
    app.register_blueprint(video_bp, url_prefix="/api/video")

    from chat.routes import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/api/chat")

    from dashboard.routes import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    from tickets.routes import tickets_bp
    app.register_blueprint(tickets_bp, url_prefix="/api/tickets")

    @app.route("/")
    def health():
        return {"status": "Backend running"}
    return app

# Instantiate the app so Gunicorn can find it
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)