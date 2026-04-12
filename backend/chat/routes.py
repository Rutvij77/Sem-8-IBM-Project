from flask import Blueprint, request, jsonify
from google import genai
from google.genai import types

chat_bp = Blueprint('chat', __name__)
client = genai.Client()

@chat_bp.route('/', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    # NEW: Accept history from the React frontend (defaults to empty list)
    history_data = data.get('history', []) 
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400

    # NEW: Convert the plain JSON history from React into Gemini Content objects
    formatted_history = []
    for msg in history_data:
        formatted_history.append(
            types.Content(
                role=msg.get('role'), 
                parts=[types.Part.from_text(text=msg.get('text'))]
            )
        )

    try:
        # NEW: Start a chat session using the past history
        chat_session = client.chats.create(
            model='gemini-2.5-flash',
            history=formatted_history,
            config=types.GenerateContentConfig(
            system_instruction="""You are a helpful AI assistant for a traffic video analytics platform. 
            Your primary job is to help users understand how to use the application and explain its features. 

            The application works in 4 simple steps:
            1. Upload a traffic video.
            2. Wait for the background video processing to complete.
            3. View the processed video to see vehicle detection and speed analysis overlays.
            4. Click the 'Dashboard' button to view the full traffic analytics dashboard.

            Answer questions related to vehicle detection, speed tracking, and how to use this platform based strictly on these 4 steps. If a user asks a general question, guide them back to uploading a video or viewing the dashboard. Keep your answers concise, friendly, and helpful."""            )
        )
        
        # Send the new message to the active chat session
        response = chat_session.send_message(user_message)
        
        return jsonify({'reply': response.text}), 200
        
    except Exception as e:
    # Catch the 503 specifically to tell the user to wait
        error_msg = str(e)
        if "503" in error_msg:
            return jsonify({'error': "The AI is a bit busy right now. Please wait 10 seconds and try again!"}), 503
        
        print(f"Full Error Log: {error_msg}")
        return jsonify({'error': error_msg}), 500