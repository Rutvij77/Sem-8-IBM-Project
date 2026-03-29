import { supabase } from "../services/supabaseClient"; // adjust path if needed

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchDashboardData = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE_URL}/api/dashboard/data`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return response.json();
};
