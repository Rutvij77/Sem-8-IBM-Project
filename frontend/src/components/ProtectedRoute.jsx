// import { Navigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// export default function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="loader-container">
//         <div className="loader-brand">
//           <div className="loader-brand-icon">
//             <svg
//               width="20"
//               height="20"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M13 10V3L4 14h7v7l9-11h-7z"
//               />
//             </svg>
//           </div>
//           <span className="loader-brand-name">
//             Vehicle Intelligence Platform
//           </span>
//         </div>

//         <div className="spinner" />
//         <p className="loader-text">Loading your session...</p>
//       </div>
//     );
//   }

//   if (!user) {
//     return <Navigate to="/" replace />;
//   }

//   return children;
// }

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, navMessage } = useAuth();

  // Show loader during session init OR page navigation
  if (loading || navMessage) {
    return (
      <div className="loader-container">
        <div className="loader-brand">
          <div className="loader-brand-icon">
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="loader-brand-name">
            Vehicle Intelligence Platform
          </span>
        </div>
        <div className="spinner" />
        {/* 👇 shows the exact message passed in, or default for session load */}
        <p className="loader-text">{navMessage || "Loading your session..."}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
