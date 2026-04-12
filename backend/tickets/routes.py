from flask import Blueprint, request, jsonify, current_app
from db.supabase_client import get_supabase_client
from utils.supabase_auth import verify_token
from datetime import datetime

tickets_bp = Blueprint("tickets", __name__)

VALID_PRIORITIES = ["Low", "Medium", "High"]
VALID_CATEGORIES = ["General", "Speed Alert", "System", "Data", "Access", "Other"]
VALID_STATUSES   = ["Open", "In Progress", "Resolved", "Closed"]
EDITABLE_STATUSES = ["Open", "In Progress"]  # analyst can edit/delete only in these


def get_profile(supabase, user_id):
    """Returns profile dict or None."""
    res = supabase.table("profiles").select("role, is_active").eq("id", user_id).execute()
    return res.data[0] if res.data else None


# ─────────────────────────────────────────────
# 🔹 GET all tickets
#    Analyst → own tickets only
#    Admin   → all tickets
# ─────────────────────────────────────────────
@tickets_bp.route("/", methods=["GET"])
def get_tickets():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    try:
        query = (
            supabase.table("tickets")
            .select("*, created_by_profile:profiles!tickets_created_by_fkey(username, email), assigned_to_profile:profiles!tickets_assigned_to_fkey(username, email)")
            .order("created_at", desc=True)
        )

        if profile["role"] == "analyst":
            query = query.eq("created_by", user_id)
        elif profile["role"] == "admin":
            query = query.or_(f"assigned_to.eq.{user_id},created_by.eq.{user_id}")

        response = query.execute()
        return jsonify(response.data), 200

    except Exception as e:
        print("Get tickets error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 GET single ticket with comments
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>", methods=["GET"])
def get_ticket(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    try:
        ticket_res = (
            supabase.table("tickets")
            .select("*, created_by_profile:profiles!tickets_created_by_fkey(username, email), assigned_to_profile:profiles!tickets_assigned_to_fkey(username, email)")
            .eq("id", ticket_id)
            .execute()
        )

        if not ticket_res.data:
            return jsonify({"error": "Ticket not found"}), 404

        ticket = ticket_res.data[0]

        # Analyst can only view their own tickets
        if profile["role"] == "analyst" and ticket["created_by"] != user_id:
            return jsonify({"error": "Access denied"}), 403

        # Get comments
        comments_res = (
            supabase.table("ticket_comments")
            .select("*, profiles(username, role)")
            .eq("ticket_id", ticket_id)
            .order("created_at", desc=False)
            .execute()
        )

        return jsonify({"ticket": ticket, "comments": comments_res.data}), 200

    except Exception as e:
        print("Get ticket error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 POST create ticket (Analyst only)
# ─────────────────────────────────────────────
@tickets_bp.route("/", methods=["POST"])
def create_ticket():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    data = request.json or {}
    title       = data.get("title", "").strip()
    priority    = data.get("priority")
    category    = data.get("category")
    description = data.get("description", "").strip()
    assigned_to = data.get("assigned_to")

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not assigned_to:
        return jsonify({"error": "Assignee is required"}), 400
    if priority not in VALID_PRIORITIES:
        return jsonify({"error": f"Priority must be one of {VALID_PRIORITIES}"}), 400
    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"Category must be one of {VALID_CATEGORIES}"}), 400

    try:
        now = datetime.utcnow().isoformat()
        res = supabase.table("tickets").insert({
            "title": title,
            "priority": priority,
            "category": category,
            "description": description,
            "status": "Open",
            "created_by": user_id,
            "assigned_to": assigned_to,
            "created_at": now,
            "updated_at": now,
        }).execute()

        return jsonify({"message": "Ticket created", "ticket": res.data[0] if res.data else {}}), 201

    except Exception as e:
        print("Create ticket error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 PATCH edit ticket (Analyst — own tickets, Open/In Progress only)
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>", methods=["PATCH"])
def edit_ticket(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    try:
        ticket_res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if not ticket_res.data:
            return jsonify({"error": "Ticket not found"}), 404

        ticket = ticket_res.data[0]

        # Analyst can only edit their own tickets that are editable
        if profile["role"] == "analyst":
            if ticket["created_by"] != user_id:
                return jsonify({"error": "Access denied"}), 403
            if ticket["status"] not in EDITABLE_STATUSES:
                return jsonify({"error": "Ticket cannot be edited once Resolved or Closed"}), 400

        data = request.json or {}
        updates = {}

        if "title" in data:
            updates["title"] = data["title"].strip()
        if "priority" in data:
            if data["priority"] not in VALID_PRIORITIES:
                return jsonify({"error": f"Priority must be one of {VALID_PRIORITIES}"}), 400
            updates["priority"] = data["priority"]
        if "category" in data:
            if data["category"] not in VALID_CATEGORIES:
                return jsonify({"error": f"Category must be one of {VALID_CATEGORIES}"}), 400
            updates["category"] = data["category"]
        if "description" in data:
            updates["description"] = data["description"]
        if "assigned_to" in data:
            if not data["assigned_to"]:
                return jsonify({"error": "Assignee is required"}), 400
            updates["assigned_to"] = data["assigned_to"]

        updates["updated_at"] = datetime.utcnow().isoformat()

        supabase.table("tickets").update(updates).eq("id", ticket_id).execute()
        return jsonify({"message": "Ticket updated"}), 200

    except Exception as e:
        print("Edit ticket error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 PATCH change ticket status (both roles)
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>/status", methods=["PATCH"])
def change_ticket_status(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    data = request.json or {}
    new_status = data.get("status")

    if new_status not in VALID_STATUSES:
        return jsonify({"error": f"Status must be one of {VALID_STATUSES}"}), 400

    try:
        ticket_res = supabase.table("tickets").select("created_by").eq("id", ticket_id).execute()
        if not ticket_res.data:
            return jsonify({"error": "Ticket not found"}), 404

        ticket = ticket_res.data[0]

        # Analyst can only update status on their own tickets
        if profile["role"] == "analyst" and ticket["created_by"] != user_id:
            return jsonify({"error": "Access denied"}), 403

        supabase.table("tickets").update({
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", ticket_id).execute()

        return jsonify({"message": f"Status updated to {new_status}"}), 200

    except Exception as e:
        print("Change status error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 DELETE ticket (Analyst — own, Open/In Progress only)
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>", methods=["DELETE"])
def delete_ticket(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    try:
        ticket_res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if not ticket_res.data:
            return jsonify({"error": "Ticket not found"}), 404

        ticket = ticket_res.data[0]

        if profile["role"] == "analyst":
            if ticket["created_by"] != user_id:
                return jsonify({"error": "Access denied"}), 403
            if ticket["status"] not in EDITABLE_STATUSES:
                return jsonify({"error": "Cannot delete a Resolved or Closed ticket"}), 400

        supabase.table("tickets").delete().eq("id", ticket_id).execute()
        return jsonify({"message": "Ticket deleted"}), 200

    except Exception as e:
        print("Delete ticket error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 GET comments for a ticket (both roles)
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>/comments", methods=["GET"])
def get_comments(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    supabase = get_supabase_client(current_app)

    try:
        response = (
            supabase.table("ticket_comments")
            .select("*, profiles(username, role)")
            .eq("ticket_id", ticket_id)
            .order("created_at", desc=False)
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 POST add comment (both roles)
# ─────────────────────────────────────────────
@tickets_bp.route("/<ticket_id>/comments", methods=["POST"])
def add_comment(ticket_id):
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    user_id = payload.id
    supabase = get_supabase_client(current_app)
    profile = get_profile(supabase, user_id)

    if not profile:
        return jsonify({"error": "Profile not found"}), 403

    data = request.json or {}
    comment_text = data.get("comment", "").strip()

    if not comment_text:
        return jsonify({"error": "Comment text is required"}), 400

    try:
        # Check ticket exists and analyst only comments on own tickets
        ticket_res = supabase.table("tickets").select("created_by, status").eq("id", ticket_id).execute()
        if not ticket_res.data:
            return jsonify({"error": "Ticket not found"}), 404

        ticket = ticket_res.data[0]
        if profile["role"] == "analyst" and ticket["created_by"] != user_id:
            return jsonify({"error": "Access denied"}), 403

        now = datetime.utcnow().isoformat()
        res = supabase.table("ticket_comments").insert({
            "ticket_id": ticket_id,
            "user_id": user_id,
            "comment": comment_text,
            "created_at": now
        }).execute()

        # If an admin comments on an 'Open' ticket, auto-change status to 'In Progress'
        if profile["role"] == "admin" and ticket.get("status") == "Open":
            supabase.table("tickets").update({
                "status": "In Progress",
                "updated_at": now
            }).eq("id", ticket_id).execute()

        return jsonify({"message": "Comment added", "comment": res.data[0] if res.data else {}}), 201

    except Exception as e:
        print("Add comment error:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 🔹 GET all admins (for assign-to dropdown)
# ─────────────────────────────────────────────
@tickets_bp.route("/admins", methods=["GET"])
def get_admins():
    payload, error_response, status = verify_token()
    if error_response:
        return error_response, status

    supabase = get_supabase_client(current_app)

    try:
        response = (
            supabase.table("profiles")
            .select("id, username, email")
            .eq("role", "admin")
            .eq("is_active", True)
            .execute()
        )
        return jsonify(response.data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
