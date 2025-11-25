import { useState, useEffect } from 'react';
import { api } from '../api';
import './Settings.css';

export default function Settings({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await api.getConfig();
      setAvailableModels(config.available_models);
      setCouncilModels(config.council_models);
      setChairmanModel(config.chairman_model);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (councilModels.length === 0) {
      setError('Select at least one council model');
      return;
    }
    if (!chairmanModel) {
      setError('Select a chairman model');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.updateConfig(councilModels, chairmanModel);
      onClose();
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleCouncilModel = (model) => {
    if (councilModels.includes(model)) {
      setCouncilModels(councilModels.filter(m => m !== model));
    } else {
      setCouncilModels([...councilModels, model]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Council Settings</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="settings-loading">
            <div className="spinner"></div>
            <span>Loading configuration...</span>
          </div>
        ) : (
          <div className="settings-content">
            {error && <div className="settings-error">{error}</div>}

            <div className="settings-section">
              <h3>Council Members</h3>
              <p className="settings-description">
                Select which models participate in the council deliberation.
                More models = better coverage but slower responses.
              </p>
              <div className="model-grid">
                {availableModels.map(model => (
                  <label key={model} className="model-checkbox">
                    <input
                      type="checkbox"
                      checked={councilModels.includes(model)}
                      onChange={() => toggleCouncilModel(model)}
                    />
                    <span className="model-name">{model}</span>
                  </label>
                ))}
              </div>
              {availableModels.length === 0 && (
                <p className="settings-warning">
                  No models available. Pull models with <code>ollama pull &lt;model&gt;</code>
                </p>
              )}
            </div>

            <div className="settings-section">
              <h3>Chairman Model</h3>
              <p className="settings-description">
                The chairman synthesizes the final answer from all responses and rankings.
              </p>
              <select
                className="chairman-select"
                value={chairmanModel}
                onChange={e => setChairmanModel(e.target.value)}
              >
                <option value="">Select a model...</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="settings-footer">
              <p className="settings-note">
                Changes apply immediately but reset when the server restarts.
                Edit <code>backend/config.py</code> for permanent changes.
              </p>
              <div className="settings-actions">
                <button className="settings-cancel" onClick={onClose}>Cancel</button>
                <button
                  className="settings-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
