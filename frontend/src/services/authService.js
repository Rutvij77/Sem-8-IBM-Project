import { supabase } from "./supabaseClient";

const API_URL = "http://localhost:5000/api/auth";

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

    if (!data.session) {
      return {
        success: true,
        needsVerification: true,
        message: "Please check your email to verify your account.",
      };
    }

    const session = data.session;
    const user = data.user;

    console.log("Session:", session);

    if (!user) {
      return { success: false, message: "Signup failed" };
    }

    // 2️⃣ Create profile in backend
    await fetch(`${API_URL}/create-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username,
        email,
      }),
    });

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

    return {
      success: true,
      session: data.session,
      user: data.user,
    };
  } catch {
    return { success: false, message: "Server error" };
  }
}

// 🔹 LOGOUT
export async function logoutUser() {
  await supabase.auth.signOut();
}
