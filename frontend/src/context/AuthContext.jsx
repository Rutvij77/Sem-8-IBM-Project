import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navMessage, setNavMessage] = useState("");
  const [videoSessions, setVideoSessions] = useState([]);
  const isLoggingOut = useRef(false);
  const loginRecorded = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const isActive = await fetchProfile(session.access_token);
        if (isActive) {
          setUser(session.user);
          setSession(session);
        } else {
          await supabase.auth.signOut();
        }
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isLoggingOut.current) return;
      if (session) {
        const isActive = await fetchProfile(session.access_token);
        if (!isActive) {
           logout();
           return;
        }

        setUser(session.user);
        setSession(session);

        // Record login session once per SIGNED_IN event
        if (_event === "SIGNED_IN" && !loginRecorded.current) {
          loginRecorded.current = true;
          recordLoginSession(session.access_token, session.user.email);
        }
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
        loginRecorded.current = false;
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (token) => {
    if (!token) return false;
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        if (data[0].is_active === false) {
           return false;
        }
        setProfile(data[0]); // includes username, role, is_active
        return true;
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
    return false;
  };

  const recordLoginSession = async (token, email) => {
    try {
      let ip_address = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ip_address = ipData.ip || "";
      } catch (_) {}

      await fetch("http://localhost:5000/api/auth/record-login", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          ip_address,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.error("Login session recording error:", err);
    }
  };

  const addVideoSession = (
    annotated_video_url,
    original_public_id,
    annotated_public_id,
  ) => {
    setVideoSessions((prev) => [
      ...prev,
      {
        id: Date.now(),
        url: annotated_video_url,
        original_public_id,
        annotated_public_id,
        uploaded_at: new Date().toLocaleString(),
      },
    ]);
  };

  const clearVideoSessions = () => setVideoSessions([]);

  const logout = async () => {
    isLoggingOut.current = true;

    try {
      const token = session?.access_token;
      if (token && videoSessions.length > 0) {
        const allPublicIds = videoSessions
          .flatMap((s) => [s.original_public_id, s.annotated_public_id])
          .filter(Boolean);

        await fetch("http://localhost:5000/api/video/delete", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_ids: allPublicIds }),
        });

        console.log("All videos deleted from Cloudinary");
      }
    } catch (err) {
      console.error("Video delete error on logout:", err);
    }

    clearVideoSessions();
    loginRecorded.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    isLoggingOut.current = false;
  };

  const startNavLoading = (message = "Taking you there...") =>
    setNavMessage(message);
  const stopNavLoading = () => setNavMessage("");

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        logout,
        navMessage,
        startNavLoading,
        stopNavLoading,
        videoSessions,
        addVideoSession,
        clearVideoSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
