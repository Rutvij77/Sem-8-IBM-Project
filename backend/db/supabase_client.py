from supabase import create_client

def get_supabase_client(app):
    url = app.config["SUPABASE_URL"]
    key = app.config["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
