import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Chatbot from "../components/Chatbox";
import { useAuth } from "../context/AuthContext";
import "../styles/home.css";

export default function Home() {
  const { profile, startNavLoading, stopNavLoading, session, addVideoSession } =
    useAuth();
  const [video, setVideo] = useState(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const navigate = useNavigate();
  const token = session?.access_token;
  const [loadingMessage, setLoadingMessage] = useState("");

  const goToHome = () => {
    startNavLoading();
    setTimeout(() => {
      stopNavLoading();
      navigate("/home");
    }, 800);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      setVideo(file);
      setStatus("");
      setVideoUrl("");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("video/")) {
      setVideo(file);
      setStatus("");
      setVideoUrl("");
    }
  };

  // const uploadVideo = async () => {
  //   if (!video || uploading) return;

  //   const token = session?.access_token;
  //   if (!token) {
  //     setStatus("Not authenticated. Please login again.");
  //     return;
  //   }

  //   setUploading(true);
  //   setStatus("Uploading...");
  //   setVideoUrl("");

  //   const formData = new FormData();
  //   formData.append("video", video);

  //   try {
  //     const res = await fetch("http://localhost:5000/api/video/upload", {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: formData,
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       setStatus(data.error || "Upload failed");
  //       setUploading(false);
  //       return;
  //     }

  //     setStatus("Upload successful! Starting analysis...");
  //     setVideoUrl(data.video_url);
  //     console.log("Cloudinary URL:", data.video_url);
  //     const processRes = await fetch(
  //       "http://localhost:5000/api/video/process",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ video_url: data.video_url }),
  //       },
  //     );

  //     const processData = await processRes.json();

  //     if (!processRes.ok) {
  //       setStatus("Upload done but analysis failed: " + processData.error);
  //       return;
  //     }

  //     setStatus(
  //       `Analysis complete! ${processData.total_rows} vehicle records stored.`,
  //     );

  //     // Navigate to dashboard after analysis
  //     setTimeout(() => {
  //       startNavLoading();
  //       navigate("/dashboard", {
  //         state: {
  //           annotated_video_url: processData.annotated_video_url,
  //         },
  //       });
  //     }, 2000);
  //   } catch (err) {
  //     setStatus("Server error");
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const uploadVideo = async () => {
    if (!video || uploading) return;

    const token = session?.access_token;
    if (!token) {
      setStatus("Not authenticated. Please login again.");
      return;
    }

    setUploading(true);
    setLoadingMessage("Uploading video to cloud...");
    setVideoUrl("");

    const formData = new FormData();
    formData.append("video", video);

    try {
      const res = await fetch("http://localhost:5000/api/video/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Upload failed");
        setUploading(false);
        setLoadingMessage("");
        return;
      }

      const original_public_id = data.public_id;
      setLoadingMessage("Analysing traffic footage...");

      setTimeout(
        () => setLoadingMessage("Detecting vehicles and calculating speeds..."),
        5000,
      );
      setTimeout(
        () => setLoadingMessage("Almost done, generating results..."),
        30000,
      );

      const processRes = await fetch(
        "http://localhost:5000/api/video/process",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            video_url: data.video_url,
            file_name: video.name,       // original file name for analysis_history
          }),
        },
      );

      const processData = await processRes.json();

      if (!processRes.ok) {
        setStatus(
          "Upload done but analysis failed: " +
            (processData.details || processData.error),
        );
        setUploading(false);
        setLoadingMessage("");
        return;
      }

      // Extract annotated video public_id from URL
      const annotated_url = processData.annotated_video_url;
      const annotated_public_id = annotated_url
        .split("/upload/")[1]
        .split("/")
        .slice(1)
        .join("/")
        .replace(".mp4", "");

      setLoadingMessage("Analysis complete! Loading your video...");

      // setTimeout(() => {
      //   navigate("/videoplayer", {
      //     state: {
      //       annotated_video_url: annotated_url,
      //       original_public_id: original_public_id,
      //       annotated_public_id: `traffic_annotated_videos/${annotated_public_id.split("/").pop()}`,
      //     },
      //   });
      // }, 1000);
      addVideoSession(
        annotated_url,
        original_public_id,
        `traffic_annotated_videos/${annotated_public_id.split("/").pop()}`,
      );

      setTimeout(() => {
        navigate("/videoplayer"); // ← no state needed anymore
      }, 1000);
    } catch (err) {
      setStatus("Server error");
      setLoadingMessage("");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="home">
        {uploading && (
          <div className="loading-overlay">
            <div className="loading-box">
              <div className="loading-spinner"></div>
              <p className="loading-message">{loadingMessage}</p>
            </div>
          </div>
        )}
        <div className="home-container">
          <div className="home-header">
            <h1>
              Welcome back,{"  "}
              {profile?.username ? profile.username.toUpperCase() : "USER"}
            </h1>
            <p>
              Upload traffic footage to begin intelligent vehicle detection and
              speed analysis.
            </p>
          </div>

          <div className="upload-card">
            <div className="card-header">
              <h3>Upload Traffic Video</h3>
              <span className="badge">Step 1</span>
            </div>

            <label
              className={`upload-box ${isDragging ? "dragging" : ""} ${video ? "has-file" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={handleFileChange}
              />

              {!video ? (
                <div className="upload-content">
                  <svg
                    className="upload-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="upload-title">
                    Click to upload or drag and drop
                  </p>
                  <p className="upload-subtitle">MP4, AVI, MOV supported</p>
                </div>
              ) : (
                <div className="file-preview">
                  <svg
                    className="file-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="file-info">
                    <p className="file-name">{video.name}</p>
                    <p className="file-size">
                      {(video.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setVideo(null);
                      setStatus("");
                      setVideoUrl("");
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </label>

            {video && (
              <button
                className="analyze-btn"
                onClick={uploadVideo}
                disabled={uploading}
              >
                <span>{uploading ? "Uploading..." : "Start Analysis"}</span>
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
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            )}
            {status && <p className="upload-status">{status}</p>}
            {videoUrl && (
              <div className="video-url-box">
                <p className="video-url-label">Cloudinary Video URL:</p>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-url-link"
                >
                  {videoUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}
