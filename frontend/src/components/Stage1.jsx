import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

export default function Stage1({ responses, elapsedTime, isLoading }) {
  const [activeTab, setActiveTab] = useState(0);

  // Auto-select newly arriving tabs
  useEffect(() => {
    if (isLoading && responses.length > 0) {
      setActiveTab(responses.length - 1);
    }
  }, [responses.length, isLoading]);

  if (!responses || responses.length === 0) {
    return null;
  }

  // Ensure activeTab is within bounds
  const safeActiveTab = Math.min(activeTab, responses.length - 1);
  const currentResponse = responses[safeActiveTab];

  return (
    <div className="stage stage1">
      <h3 className="stage-title">
        Stage 1: Individual Responses
        {isLoading && (
          <span className="stage-progress">
            {responses.length} model{responses.length !== 1 ? 's' : ''} complete...
          </span>
        )}
        {!isLoading && elapsedTime !== null && elapsedTime !== undefined && (
          <span className="stage-time">{elapsedTime}s</span>
        )}
      </h3>

      <div className="tabs">
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`tab ${safeActiveTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {resp.model.split('/')[1] || resp.model}
          </button>
        ))}
        {isLoading && (
          <div className="tab tab-loading">
            <div className="tab-spinner"></div>
          </div>
        )}
      </div>

      <div className="tab-content">
        <div className="model-name">{currentResponse.model}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{currentResponse.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
