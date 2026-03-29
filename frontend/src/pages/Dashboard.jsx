// import React from "react";
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";

// export default function Dashboard() {
//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         height: "100vh",
//         overflow: "hidden",
//       }}
//     >
//       <Navbar />

//       <main
//         style={{
//           flex: 1,
//           height: 0 /* forces flexbox to control the height */,
//           display: "flex",
//           flexDirection: "column",
//           background: "#000",
//         }}
//       >
//         <iframe
//           title="Dashboard"
//           style={{
//             flex: 1,
//             width: "100%",
//             height: "100%",
//             border: "none",
//             display: "block",
//           }}
//           src={`${import.meta.env.VITE_POWER_BI_SRC}&filterPaneEnabled=false&navContentPaneEnabled=false`}
//           allowFullScreen={true}
//         />
//       </main>

//       <Footer />
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import { fetchDashboardData } from "../services/dashboardService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

const BLUE = "#0066cc";
const ORANGE = "#f97316";

// Tooltip style reused across all charts
const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #d0dce8",
    borderRadius: "8px",
  },
  labelStyle: { color: "#1a2f4e", fontWeight: 600 },
};

const tickStyle = { fill: "#5a7a99", fontSize: 12 };

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { startNavLoading, stopNavLoading } = useAuth();
  const navigate = useNavigate();

  const goToHome = () => {
    startNavLoading();
    setTimeout(() => {
      stopNavLoading();
      navigate("/home");
    }, 800);
  };

  useEffect(() => {
    fetchDashboardData()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
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
        <p className="loader-text">Loading Dashboard...</p>
      </div>
    );
  }
  if (error) return <div className="dashboard-error">Error: {error}</div>;

  if (!data || data.empty) {
    return (
      <div className="dashboard-wrapper">
        <Navbar />
        <div className="dashboard-main">
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
            <h2 className="empty-state-title">No Analytics Data Yet</h2>
            <p className="empty-state-message">
              Your dashboard is ready — but there's no vehicle data to display.
              <br />
              Upload a traffic video and run the analysis to see your insights
              here.
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
                <span>Return here to view analytics</span>
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

  const {
    kpi,
    chart1_vehicle_type_count,
    chart2_speed_by_type,
    chart3_speed_by_timestamp,
    chart4_speed_range_bucket,
  } = data;

  return (
    <div className="dashboard-wrapper">
      <Navbar />

      <div className="dashboard-main">
        <h1 className="dashboard-title">
          📊 Vehicle Tracking & Speed Detection — Analytics Dashboard
        </h1>

        {/* ── KPI Cards ── */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-value">{kpi.total_vehicles}</div>
            <div className="kpi-label">Total Vehicles</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{kpi.total_incoming}</div>
            <div className="kpi-label">Incoming Vehicles</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{kpi.total_outgoing}</div>
            <div className="kpi-label">Outgoing Vehicles</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{kpi.total_overspeed}</div>
            <div className="kpi-label">Overspeed Vehicles</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{kpi.overspeed_percentage}%</div>
            <div className="kpi-label">Overspeed %</div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="charts-grid">
          {/* Chart 1 — Count by vehicle type */}
          <div className="chart-card">
            <div className="chart-title">Count of Vehicles by Vehicle Type</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart1_vehicle_type_count}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf2" />
                <XAxis dataKey="vehicle_type" tick={tickStyle} />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2 — Max & Avg speed by vehicle type */}
          <div className="chart-card">
            <div className="chart-title">
              Max Speed and Avg Speed by Vehicle Type
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart2_speed_by_type} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf2" />
                <XAxis type="number" tick={tickStyle} />
                <YAxis
                  dataKey="vehicle_type"
                  type="category"
                  tick={tickStyle}
                />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ color: "#5a7a99", fontSize: 12 }} />
                <Bar
                  dataKey="max_speed"
                  name="Max Speed"
                  fill={BLUE}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="avg_speed"
                  name="Average Speed"
                  fill={ORANGE}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3 — Speed sum by timestamp */}
          <div className="chart-card">
            <div className="chart-title">Sum of Speed (kmph) by Timestamp</div>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf2" />
                <XAxis
                  dataKey="video_time_seconds"
                  name="Timestamp"
                  tick={{ fill: "#5a7a99", fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  dataKey="total_speed"
                  name="Total Speed"
                  tick={tickStyle}
                />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Scatter data={chart3_speed_by_timestamp} fill={BLUE} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4 — Count by speed range */}
          <div className="chart-card">
            <div className="chart-title">Count of Vehicles by Speed Range</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart4_speed_range_bucket}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf2" />
                <XAxis dataKey="speed_range" tick={tickStyle} />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
