from flask import Blueprint, jsonify, current_app, request
from db.supabase_client import get_supabase_client
from utils.supabase_auth import verify_token

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/data", methods=["GET"])
def get_dashboard_data():
    try:
        payload, error_response, status = verify_token()
        if error_response:
            return error_response, status

        user_id = payload.id

        supabase = get_supabase_client(current_app)

        # Fetch all data from vehicle_data table
        response = supabase.table("vehicle_data").select("*").eq("user_id", user_id).execute()
        data = response.data

        if not data:
            return jsonify({
            "empty": True,
            "kpi": None,
            "chart1_vehicle_type_count": [],
            "chart2_speed_by_type": [],
            "chart3_speed_by_timestamp": [],
            "chart4_speed_range_bucket": []
        }), 200

        # ── KPI Cards ──────────────────────────────────────────
        total_vehicles = len(data)

        incoming = [r for r in data if r["direction"] == "Incoming"]
        outgoing = [r for r in data if r["direction"] == "Outcoming"]
        total_incoming = len(incoming)
        total_outgoing = len(outgoing)

        overspeed_vehicles = [r for r in data if r["is_overspeed"] == True]
        total_overspeed = len(overspeed_vehicles)
        overspeed_percentage = round((total_overspeed / total_vehicles) * 100, 2) if total_vehicles > 0 else 0

        # ── Chart 1: Count of vehicles by vehicle_type ─────────
        vehicle_type_count = {}
        for r in data:
            vtype = r["vehicle_type"]
            vehicle_type_count[vtype] = vehicle_type_count.get(vtype, 0) + 1

        chart1 = [{"vehicle_type": k, "count": v} for k, v in vehicle_type_count.items()]

        # ── Chart 2: Max speed and Avg speed by vehicle_type ───
        speed_by_type = {}
        for r in data:
            vtype = r["vehicle_type"]
            speed = r["speed_kmph"]
            if vtype not in speed_by_type:
                speed_by_type[vtype] = {"speeds": []}
            speed_by_type[vtype]["speeds"].append(speed)

        chart2 = []
        for vtype, val in speed_by_type.items():
            speeds = val["speeds"]
            chart2.append({
                "vehicle_type": vtype,
                "max_speed": max(speeds),
                "avg_speed": round(sum(speeds) / len(speeds), 2)
            })

        # ── Chart 3: Sum of speed_kmph by timestamp ────────────
        speed_by_time = {}
        for r in data:
            ts = r["video_time_seconds"]
            speed = r["speed_kmph"]
            speed_by_time[ts] = speed_by_time.get(ts, 0) + speed

        chart3 = [{"video_time_seconds": k, "total_speed": v} for k, v in sorted(speed_by_time.items())]

        # ── Chart 4: Count of vehicles by speed_range_bucket ───
        bucket_count = {}
        for r in data:
            bucket = r["speed_range_bucket"]
            bucket_count[bucket] = bucket_count.get(bucket, 0) + 1

        chart4 = [{"speed_range": k, "count": v} for k, v in sorted(bucket_count.items())]

        # ── Final Response ──────────────────────────────────────
        return jsonify({
            "kpi": {
                "total_vehicles": total_vehicles,
                "total_incoming": total_incoming,
                "total_outgoing": total_outgoing,
                "total_overspeed": total_overspeed,
                "overspeed_percentage": overspeed_percentage
            },
            "chart1_vehicle_type_count": chart1,
            "chart2_speed_by_type": chart2,
            "chart3_speed_by_timestamp": chart3,
            "chart4_speed_range_bucket": chart4
        })

    except Exception as e:
        print("Dashboard error:", str(e))
        return jsonify({"error": str(e)}), 500