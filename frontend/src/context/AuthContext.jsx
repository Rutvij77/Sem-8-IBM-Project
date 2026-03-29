// import { createContext, useContext, useEffect, useState } from "react";
// import { supabase } from "../services/supabaseClient";

// const AuthContext = createContext();

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null); // Supabase user
//   const [profile, setProfile] = useState(null); // Username from DB
//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const initializeAuth = async () => {
//       // 1. Get current session
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();

//       if (session) {
//         setUser(session.user);
//         setSession(session);
//         // 2. Fetch the profile using the access token
//         await fetchProfile(session.access_token);
//       } else {
//         setUser(null);
//         setSession(null);
//         setProfile(null);
//       }

//       // 3. Turn off loading ONLY after everything is fetched
//       setLoading(false);
//     };

//     initializeAuth();

//     // 4. Listen for auth changes (login/logout)
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(async (_event, session) => {
//       if (session) {
//         setUser(session.user);
//         setSession(session);
//         await fetchProfile(session.access_token);
//       } else {
//         setUser(null);
//         setSession(null);
//         setProfile(null);
//       }
//       setLoading(false);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   const fetchProfile = async (token) => {
//     if (!token) return;
//     try {
//       const res = await fetch("http://localhost:5000/api/auth/me", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await res.json();

//       if (res.ok && data.length > 0) {
//         setProfile(data[0]); // contains username
//       }
//     } catch (err) {
//       console.error("Profile fetch error:", err);
//     }
//   };

//   const logout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//     setProfile(null);
//     setSession(null);
//   };

//   return (
//     <AuthContext.Provider value={{ user, profile, loading, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navMessage, setNavMessage] = useState("");
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setSession(session);
        await fetchProfile(session.access_token);
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
        setUser(session.user);
        setSession(session);
        await fetchProfile(session.access_token);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (token) => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        setProfile(data[0]);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  const logout = async () => {
    isLoggingOut.current = true;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    isLoggingOut.current = false;
  };

  // 👇 new: call this before any navigation
  const startNavLoading = (message = "Taking you there...") =>
    setNavMessage(message);
  const stopNavLoading = () => setNavMessage("");

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        logout,
        navMessage,
        startNavLoading,
        stopNavLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
