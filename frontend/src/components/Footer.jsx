import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-brand">
            <svg
              className="footer-icon"
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
            <span>Vehicle Intelligence Platform</span>
          </div>
          <p className="footer-text">
            Advanced AI-powered vehicle detection and speed analysis
          </p>
        </div>
        <p className="footer-copyright">
          &copy; 2026 Vehicle Intelligence Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
