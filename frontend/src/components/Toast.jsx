import { useEffect, useState } from "react";
import "../styles/toast.css";

/**
 * Toast — single notification pill.
 * Props: message, type ("success"|"error"|"info"), onClose
 */
export function Toast({ message, type = "success", onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300); // let exit animation finish
    }, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type} ${exiting ? "toast-exit" : ""}`}>
      <span className="toast-icon">
        {type === "success" && (
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === "error" && (
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {type === "info" && (
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01" />
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
        )}
      </span>
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={() => { setExiting(true); setTimeout(onClose, 300); }}>×</button>
    </div>
  );
}

/**
 * ToastContainer — renders all active toasts in the top-right corner.
 * Props: toasts (array of {id, message, type}), removeToast(id)
 */
export function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

/**
 * useToast — hook for managing toast state.
 * Returns { toasts, showToast, removeToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, removeToast };
}
