// import { useEffect, useRef } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";
// import { useAuth } from "../context/AuthContext";
// import "../styles/videoPlayer.css";

// export default function VideoPlayer() {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const { session } = useAuth();
//   const hasDeleted = useRef(false);

//   const annotated_video_url = location.state?.annotated_video_url || "";
//   const original_public_id = location.state?.original_public_id || "";
//   const annotated_public_id = location.state?.annotated_public_id || "";

//   // If no video URL redirect to home
//   useEffect(() => {
//     if (!annotated_video_url) {
//       navigate("/home");
//     }
//   }, [annotated_video_url]);

//   const deleteVideos = async () => {
//     if (hasDeleted.current) return;
//     hasDeleted.current = true;

//     try {
//       const token = session?.access_token;
//       await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/video/delete", {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           public_ids: [original_public_id, annotated_public_id],
//         }),
//       });
//       console.log("Videos deleted successfully");
//     } catch (err) {
//       console.error("Delete error:", err);
//     }
//   };

//   return (
//     <div className="videoplayer-wrapper">
//       <Navbar onDashboardClick={deleteVideos} />

//       <main className="videoplayer-main">
//         <div className="videoplayer-container">
//           <div className="videoplayer-header">
//             <h1>🎥 Traffic Analysis Complete</h1>
//             <p>
//               Your video has been analysed. Watch the results below then head to
//               the dashboard to view detailed statistics.
//             </p>
//           </div>

//           <div className="videoplayer-box">
//             {annotated_video_url ? (
//               <video
//                 controls
//                 autoPlay
//                 className="videoplayer-video"
//                 src={annotated_video_url}
//               >
//                 Your browser does not support the video tag.
//               </video>
//             ) : (
//               <p>No video available.</p>
//             )}
//           </div>

//           <div className="videoplayer-note">
//             <span>⚠️</span>
//             <p>
//               This video is available only once. Click{" "}
//               <strong>Dashboard</strong> in the navbar to view your analytics.
//             </p>
//           </div>
//         </div>
//       </main>

//       <Footer />
//     </div>
//   );
// }

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import "../styles/videoPlayer.css";

export default function VideoPlayer() {
  const navigate = useNavigate();
  const { session, videoSessions, startNavLoading, stopNavLoading } = useAuth();
  const videoRef = useRef(null);

  const [selectedId, setSelectedId] = useState(
    videoSessions.at(-1)?.id ?? null,
  );

  const selectedSession = videoSessions.find((s) => s.id === selectedId);

  const goToHome = () => {
    startNavLoading();
    setTimeout(() => {
      stopNavLoading();
      navigate("/home");
    }, 800);
  };

  // Empty state — no videos uploaded yet
  if (videoSessions.length === 0) {
    return (
      <div className="videoplayer-wrapper">
        <Navbar />
        <div className="videoplayer-main">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg
                width="64"
                height="64"
                fill="none"
                stroke="#0066cc"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.5V19a1 1 0 001 1h16a1 1 0 001-1v-5.5M3 13.5l9-9 9 9M3 13.5h4.5v4h9v-4H21"
                />
              </svg>
            </div>
            <h2 className="empty-state-title">No Videos Yet</h2>
            <p className="empty-state-message">
              You haven't uploaded any traffic video yet.
              <br />
              Upload one from the Home page to see it here.
            </p>
            <div className="empty-state-steps">
              <div className="empty-step">
                <span className="empty-step-number">1</span>
                <span>Go to Home page</span>
              </div>
              <div className="empty-step-arrow">→</div>
              <div className="empty-step">
                <span className="empty-step-number">2</span>
                <span>Upload a traffic video</span>
              </div>
              <div className="empty-step-arrow">→</div>
              <div className="empty-step">
                <span className="empty-step-number">3</span>
                <span>Return here to watch</span>
              </div>
            </div>
            <button className="empty-state-btn" onClick={goToHome}>
              ← Go Upload a Video
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="videoplayer-wrapper">
      <Navbar />

      <main className="videoplayer-main">
        <div className="videoplayer-container">
          <div className="videoplayer-header">
            <h1>🎥 Traffic Analysis — Video Player</h1>
            <p>
              Watch your analysed video. Head to the Dashboard for detailed
              statistics.
            </p>
          </div>

          {/* Session selector — only if more than 1 video */}
          {videoSessions.length > 1 && (
            <div className="session-selector-wrapper">
              <label className="session-label">Select Video:</label>
              <select
                className="session-selector"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(Number(e.target.value));
                  // reset video to start when switching
                  if (videoRef.current) videoRef.current.load();
                }}
              >
                {videoSessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    Video {i + 1} — {s.uploaded_at}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="videoplayer-box">
            <video
              ref={videoRef}
              controls
              autoPlay
              className="videoplayer-video"
              src={selectedSession?.url}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="videoplayer-note">
            <span>ℹ️</span>
            <p>
              Videos are available until you log out. Click{" "}
              <strong>Dashboard</strong> in the navbar to view analytics.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
