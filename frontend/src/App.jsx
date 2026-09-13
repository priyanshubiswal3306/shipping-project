import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API = "https://shipping-project-a3hh.onrender.com/api";
const SHIPMENT_MODES = ["Ship", "Flight", "Road"];

const DEFAULT_FORM = {
  weight_in_gms: "",
  discount_offered: "",
  cost_of_the_product: "",
  prior_purchases: "",
  mode_of_shipment: "Ship",
};

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [prediction, setPrediction] = useState(null);
  const [probability, setProbability] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError, setPredError] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      role: "model",
      content:
        "Hello! I'm your AI Supply Chain Expert. Run a prediction first, then ask me anything about your shipment, logistics optimisation, or delivery strategy.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [smsNumber, setSmsNumber] = useState("");
  const [smsStatus, setSmsStatus] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setPredError("");
    setPredLoading(true);
    setPrediction(null);
    setProbability(null);
    
    try {
      const payload = {
        weight_in_gms: parseFloat(form.weight_in_gms),
        discount_offered: parseFloat(form.discount_offered),
        cost_of_the_product: parseFloat(form.cost_of_the_product),
        prior_purchases: parseInt(form.prior_purchases, 10),
        mode_of_shipment: form.mode_of_shipment,
      };
      const { data } = await axios.post(`${API}/predict`, payload);
      
      console.log("RAW BACKEND DATA:", data); // Diagnostic Trapdoor
      
      setPrediction(data.prediction);
      setProbability(data.probability);
    } catch {
      setPredError("Prediction failed. Check the backend is running.");
    } finally {
      setPredLoading(false);
    }
  };

  const handleSmsRegister = async (e) => {
    e.preventDefault();
    setSmsStatus("");
    setSmsLoading(true);
    try {
      const { data } = await axios.post(`${API}/register_sms`, {
        mobile_number: smsNumber,
      });
      setSmsStatus(data.message);
    } catch {
      setSmsStatus("Error registering number.");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMsg = { role: "user", content: trimmed };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    const historyForApi = newMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data } = await axios.post(`${API}/chat`, {
        message: trimmed,
        prediction_context: prediction
          ? `Package is predicted to be: ${prediction}` + (probability !== null ? ` with a ${probability}% probability.` : ".")
          : null,
        history: historyForApi,
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "model", content: data.reply },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, I couldn't connect to the AI backend. Please check your Gemini API key.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🚚</span>
            <div>
              <div className="logo-title">LogistiQ</div>
              <div className="logo-sub">AI Delivery Intelligence</div>
            </div>
          </div>
        </div>

        <div className="sidebar-scroll">
          <section className="card">
            <h2 className="card-title">
              <span className="card-icon">📦</span> Delivery Prediction
            </h2>
            <form onSubmit={handlePredict} className="form">
              <label className="field">
                <span>Weight (grams)</span>
                <input
                  type="number"
                  name="weight_in_gms"
                  placeholder="e.g. 4500"
                  value={form.weight_in_gms}
                  onChange={handleFormChange}
                  required
                  min="0"
                />
              </label>

              <label className="field">
                <span>Discount Offered (%)</span>
                <input
                  type="number"
                  name="discount_offered"
                  placeholder="e.g. 10"
                  value={form.discount_offered}
                  onChange={handleFormChange}
                  required
                  min="0"
                  max="100"
                />
              </label>

              <label className="field">
                <span>Product Cost ($)</span>
                <input
                  type="number"
                  name="cost_of_the_product"
                  placeholder="e.g. 250"
                  value={form.cost_of_the_product}
                  onChange={handleFormChange}
                  required
                  min="0"
                />
              </label>

              <label className="field">
                <span>Prior Purchases</span>
                <input
                  type="number"
                  name="prior_purchases"
                  placeholder="e.g. 3"
                  value={form.prior_purchases}
                  onChange={handleFormChange}
                  required
                  min="0"
                />
              </label>

              <label className="field">
                <span>Shipment Mode</span>
                <select
                  name="mode_of_shipment"
                  value={form.mode_of_shipment}
                  onChange={handleFormChange}
                >
                  {SHIPMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={predLoading}
              >
                {predLoading ? (
                  <span className="spinner" />
                ) : (
                  "Run Prediction"
                )}
              </button>

              {predError && (
                <p className="error-msg">{predError}</p>
              )}
            </form>

            {prediction && (
              <div
                className={`prediction-badge ${
                  prediction === "Delayed" ? "badge-delayed" : "badge-ontime"
                }`}
              >
                <span className="badge-icon">
                  {prediction === "Delayed" ? "⚠️" : "✅"}
                </span>
                <div>
                  <div className="badge-label">Prediction Result</div>
                  <div className="badge-value">
                    {prediction} 
                    {/* TRAPDOOR CHECK */}
                    {probability !== null && probability !== undefined ? (
                      <span style={{fontSize: '0.85em', opacity: 0.8, marginLeft: '6px'}}>
                        ({probability}%)
                      </span>
                    ) : (
                      <span style={{fontSize: '0.7em', color: 'red', marginLeft: '6px'}}>
                        [Backend Not Sending %]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">
              <span className="card-icon">📱</span> SMS Alerts
            </h2>
            <form onSubmit={handleSmsRegister} className="form">
              <label className="field">
                <span>Mobile Number</span>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={smsNumber}
                  onChange={(e) => {
                    setSmsStatus("");
                    setSmsNumber(e.target.value);
                  }}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={smsLoading}
              >
                {smsLoading ? <span className="spinner" /> : "Register for Alerts"}
              </button>
              {smsStatus && (
                <p
                  className={
                    smsStatus.startsWith("Invalid") || smsStatus.startsWith("Error")
                      ? "error-msg"
                      : "success-msg"
                  }
                >
                  {smsStatus}
                </p>
              )}
            </form>
          </section>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">Supply Chain AI Assistant</h1>
            <p className="chat-subtitle">
              Powered by Gemini · Context-aware logistics intelligence
            </p>
          </div>
          {prediction && (
            <div
              className={`header-badge ${
                prediction === "Delayed"
                  ? "badge-delayed"
                  : "badge-ontime"
              }`}
            >
              {prediction === "Delayed" ? "⚠️" : "✅"} {prediction} {probability !== null && `(${probability}%)`}
            </div>
          )}
        </header>

        <div className="chat-messages">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`message-row ${
                msg.role === "user" ? "row-user" : "row-model"
              }`}
            >
              {msg.role === "model" && (
                <div className="avatar avatar-ai">🤖</div>
              )}
              <div
                className={`bubble ${
                  msg.role === "user" ? "bubble-user" : "bubble-model"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="avatar avatar-user">👤</div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="message-row row-model">
              <div className="avatar avatar-ai">🤖</div>
              <div className="bubble bubble-model typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleChat}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about your shipment, supply chain risks, optimisation strategies…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
          />
          <button
            type="submit"
            className="btn btn-send"
            disabled={chatLoading || !chatInput.trim()}
          >
            {chatLoading ? <span className="spinner spinner-sm" /> : "Send ↑"}
          </button>
        </form>
      </main>
    </div>
  );
}