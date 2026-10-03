import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI Uncaught Error:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", fontFamily: "sans-serif", background: "#090d13", color: "#f87171", minHeight: "100vh" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#ef4444" }}>⚠️ Application Encountered an Error</h2>
          <pre style={{ background: "#1e293b", padding: "16px", borderRadius: "12px", color: "#f1f5f9", overflowX: "auto", fontSize: "13px" }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "10px", background: "#006EB2", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)

