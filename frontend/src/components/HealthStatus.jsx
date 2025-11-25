import { useState, useEffect } from 'react';
import { api } from '../api';
import './HealthStatus.css';

export default function HealthStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.checkHealth();
      setHealth(data);
    } catch (err) {
      setError('Cannot connect to backend. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if dismissed or if everything is ready
  if (dismissed || (health?.ready && !error)) {
    return null;
  }

  if (loading) {
    return (
      <div className="health-status health-loading">
        <div className="health-spinner"></div>
        <span>Checking Ollama status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-status health-error">
        <div className="health-icon">⚠️</div>
        <div className="health-message">
          <strong>Backend Unavailable</strong>
          <p>{error}</p>
        </div>
        <button className="health-retry" onClick={checkHealth}>Retry</button>
      </div>
    );
  }

  if (!health.ollama_available) {
    return (
      <div className="health-status health-error">
        <div className="health-icon">⚠️</div>
        <div className="health-message">
          <strong>Ollama Not Running</strong>
          <p>Start Ollama with: <code>ollama serve</code></p>
        </div>
        <button className="health-retry" onClick={checkHealth}>Retry</button>
      </div>
    );
  }

  // Some models missing
  const missingModels = health.council_models
    .filter(m => !m.available)
    .map(m => m.model);

  if (!health.chairman_model.available) {
    missingModels.push(health.chairman_model.model + ' (chairman)');
  }

  if (missingModels.length > 0) {
    return (
      <div className="health-status health-warning">
        <div className="health-icon">⚠️</div>
        <div className="health-message">
          <strong>Missing Models</strong>
          <p>Pull these models to use the council:</p>
          <ul>
            {missingModels.map((model, i) => (
              <li key={i}><code>ollama pull {model.replace(' (chairman)', '')}</code></li>
            ))}
          </ul>
        </div>
        <div className="health-actions">
          <button className="health-retry" onClick={checkHealth}>Retry</button>
          <button className="health-dismiss" onClick={() => setDismissed(true)}>Dismiss</button>
        </div>
      </div>
    );
  }

  return null;
}
