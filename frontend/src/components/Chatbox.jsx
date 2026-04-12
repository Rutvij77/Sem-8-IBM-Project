// // src/components/Chatbot.jsx
// import React, { useState, useRef, useEffect } from "react";
// import "../styles/chatbot.css";

// export default function Chatbot() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [input, setInput] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   // Auto-scroll to bottom when new messages arrive
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isOpen]);

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     // Save the current history to send to backend, then add the new user message to UI
//     const currentHistory = [...messages];
//     const userMsg = { role: "user", text: input };

//     setMessages((prev) => [...prev, userMsg]);
//     setInput("");
//     setIsLoading(true);

//     try {
//       const response = await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/chat/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           message: userMsg.text,
//           history: currentHistory, // Pass the conversation memory
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to fetch response");
//       }

//       const botMsg = { role: "model", text: data.reply };
//       setMessages((prev) => [...prev, botMsg]);
//     } catch (error) {
//       console.error("Chat error:", error);
//       setMessages((prev) => [
//         ...prev,
//         {
//           role: "model",
//           text: "Sorry, I am having trouble connecting to the server.",
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="chatbot-container">
//       {/* The Floating Window */}
//       {isOpen && (
//         <div className="chatbot-window">
//           <div className="chatbot-header">
//             <span>Traffic Assistant</span>
//             <button
//               className="chatbot-close-btn"
//               onClick={() => setIsOpen(false)}
//             >
//               ✕
//             </button>
//           </div>

//           <div className="chatbot-messages">
//             {messages.length === 0 && (
//               <div className="message model">
//                 Hello! I'm your AI assistant. Ask me anything about vehicle
//                 detection or your analytics dashboard!
//               </div>
//             )}
//             {messages.map((msg, idx) => (
//               <div key={idx} className={`message ${msg.role}`}>
//                 {msg.text}
//               </div>
//             ))}
//             {isLoading && (
//               <div className="loading-text">Assistant is typing...</div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>

//           <div className="chatbot-input-area">
//             <input
//               type="text"
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//               placeholder="Ask a question..."
//               disabled={isLoading}
//             />
//             <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
//               Send
//             </button>
//           </div>
//         </div>
//       )}

//       {/* The Toggle Button */}
//       {!isOpen && (
//         <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
//           <svg
//             width="28"
//             height="28"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth="2"
//               d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
//             />
//           </svg>
//         </button>
//       )}
//     </div>
//   );
// }

// src/components/Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import "../styles/chatbot.css";

// Parses **bold** markdown into <strong> tags
// function formatText(text) {
//   const parts = text.split(/\*\*(.*?)\*\*/g);
//   return parts.map((part, i) =>
//     i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
//   );
// }

function formatText(text) {
  // Split on numbered list patterns like "1. ", "2. ", etc.
  const listPattern = /(\d+\.\s)/g;

  if (!listPattern.test(text)) {
    // No list — just render bold
    return text
      .split(/\*\*(.*?)\*\*/g)
      .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  }

  // Split text into "intro" + list items
  const parts = text.split(/(?=\d+\.\s)/g); // split before each "1. "

  return parts.map((part, i) => {
    const isItem = /^\d+\.\s/.test(part);

    // Render bold within each part
    const renderBold = (str) =>
      str
        .split(/\*\*(.*?)\*\*/g)
        .map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p));

    if (isItem) {
      const num = part.match(/^(\d+)\.\s/)[1];
      const content = part.replace(/^\d+\.\s/, "");
      return (
        <div key={i} className="msg-list-item">
          <span className="msg-list-num">{num}</span>
          <span>{renderBold(content)}</span>
        </div>
      );
    }

    return (
      <p key={i} className="msg-intro">
        {renderBold(part)}
      </p>
    );
  });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const currentHistory = messages.slice(-6);
    const userMsg = { role: "user", text: input };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          history: currentHistory,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to fetch response");

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, I'm having trouble connecting to the server.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <svg
                  width="16"
                  height="16"
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
              <div>
                <div className="chatbot-title">Traffic Assistant</div>
                <div className="chatbot-status">
                  <span className="status-dot" />
                  Online
                </div>
              </div>
            </div>
            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <div className="welcome-icon">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <p>
                  Hello! I'm your AI assistant. Ask me anything about vehicle
                  detection or your analytics dashboard!
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role}`}>
                {msg.role === "model" && (
                  <div className="msg-avatar bot-avatar">
                    <svg
                      width="12"
                      height="12"
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
                )}
                <div className={`message-bubble ${msg.role}`}>
                  {msg.role === "model" ? formatText(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row model">
                <div className="msg-avatar bot-avatar">
                  <svg
                    width="12"
                    height="12"
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
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <svg
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
