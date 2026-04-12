import { supabase } from "./supabaseClient";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/auth";

// 🔹 SIGNUP
export async function signupUser({ username, email, password }) {
  try {
    // 1️⃣ Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Supabase signup response:", data, error);

    if (error) {
      return { success: false, message: error.message };
    }

    const user = data.user;
    if (!user) {
      return { success: false, message: "Signup failed" };
    }

    // 2️⃣ Create profile in backend BEFORE returning for verification
    await fetch(`${API_URL}/register-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        username,
        email,
      }),
    });

    if (!data.session) {
      return {
        success: true,
        needsVerification: true,
        message: "Please check your email to verify your account.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Signup error:", err);
    return { success: false, message: err.message };
  }
}

// 🔹 LOGIN
export async function loginUser({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/auth/me", {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });

    if (res.ok) {
      const pData = await res.json();
      if (!pData || pData.length === 0 || !pData[0].is_active) {
        await supabase.auth.signOut();
        return { success: false, message: "Your account is deactivated. Please contact an administrator." };
      }
    } else {
      const { data: currentSession } = await supabase.auth.getSession();
      await supabase.auth.signOut();
      if (!currentSession.session) {
        return { success: false, message: "Your account is deactivated. Please contact an administrator." };
      }
      return { success: false, message: "Failed to verify account status. Please try again." };
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
    };
  } catch (err) {
    const { data: currentSession } = await supabase.auth.getSession();
    if (!currentSession.session) {
      return { success: false, message: "Your account is deactivated. Please contact an administrator." };
    }
    return { success: false, message: "Server error" };
  }
}

// 🔹 LOGOUT
export async function logoutUser() {
  await supabase.auth.signOut();
}
