import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const SYMPTOMS = [
  { id: 'fever', name: 'Fever', icon: '🌡️', category: 'General' },
  { id: 'cough', name: 'Cough', icon: '😷', category: 'Respiratory' },
  { id: 'difficulty_breathing', name: 'Difficulty Breathing', icon: '🫁', category: 'Respiratory' },
  { id: 'chest_pain', name: 'Chest Pain', icon: '❤️', category: 'Cardiac' },
  { id: 'headache', name: 'Headache', icon: '🤕', category: 'Neurological' },
  { id: 'dizziness', name: 'Dizziness', icon: '💫', category: 'Neurological' },
  { id: 'abdominal_pain', name: 'Abdominal Pain', icon: '🤢', category: 'Digestive' },
  { id: 'diarrhea', name: 'Diarrhea', icon: '🚽', category: 'Digestive' },
  { id: 'vomiting', name: 'Vomiting', icon: '🤮', category: 'Digestive' },
  { id: 'rash', name: 'Skin Rash', icon: '🔴', category: 'Skin' },
  { id: 'joint_pain', name: 'Joint Pain', icon: '🦵', category: 'Musculoskeletal' },
  { id: 'fatigue', name: 'Fatigue', icon: '😴', category: 'General' },
  { id: 'sore_throat', name: 'Sore Throat', icon: '😖', category: 'ENT' },
  { id: 'ear_pain', name: 'Ear Pain', icon: '👂', category: 'ENT' },
  { id: 'urinary_burning', name: 'Burning Urination', icon: '💧', category: 'Urinary' },
];

const CATEGORIES = [...new Set(SYMPTOMS.map(s => s.category))];

export default function SymptomChecker() {
  const { t } = useTranslation();
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.analyzeSymptoms(selectedSymptoms, language);
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSymptoms = activeCategory === 'All' 
    ? SYMPTOMS 
    : SYMPTOMS.filter(s => s.category === activeCategory);

  const getSeverityColor = (level) => {
    switch (level) {
      case 'critical': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#F9A825';
      default: return '#2E7D32';
    }
  };

  return (
    <div className="symptom-checker">
      <div className="checker-header">
        <h2>{t('symptomChecker.title')}</h2>
        <p>Select your symptoms to get possible conditions and recommendations</p>
        <div className="language-selector">
          <label>Language: </label>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="te">తెలుగు</option>
            <option value="ta">தமிழ்</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
      </div>

      <div className="checker-content">
        <div className="symptom-selector">
          <div className="category-tabs">
            <button 
              className={activeCategory === 'All' ? 'active' : ''}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={activeCategory === cat ? 'active' : ''}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="symptom-grid">
            {filteredSymptoms.map(symptom => (
              <button
                key={symptom.id}
                className={`symptom-card ${selectedSymptoms.includes(symptom.id) ? 'selected' : ''}`}
                onClick={() => toggleSymptom(symptom.id)}
                type="button"
              >
                <span className="symptom-icon">{symptom.icon}</span>
                <span className="symptom-name">{symptom.name}</span>
              </button>
            ))}
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="selected-summary">
              <h4>Selected ({selectedSymptoms.length})</h4>
              <div className="selected-chips">
                {selectedSymptoms.map(id => {
                  const s = SYMPTOMS.find(s => s.id === id);
                  return (
                    <span key={id} className="chip">
                      {s?.icon} {s?.name}
                      <button onClick={() => toggleSymptom(id)}>×</button>
                    </span>
                  );
                })}
              </div>
              <button 
                className="btn btn-primary btn-full" 
                onClick={handleAnalyze} 
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze Symptoms'}
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
        </div>

        {result && (
          <div className="result-panel">
            <div className="result-header">
              <h3>Analysis Result</h3>
              <span className={`risk-badge risk-${result.risk_level}`}>{result.risk_level.toUpperCase()}</span>
            </div>

            <div className="result-section">
              <h4>🎯 Recommendation: {result.recommendation.replace('_', ' ').toUpperCase()}</h4>
              <p>{result.ai_explanation}</p>
            </div>

            {result.conditions?.length > 0 && (
              <div className="result-section">
                <h4>🏥 {t('symptomChecker.possibleConditions')}</h4>
                <div className="conditions-list">
                  {result.conditions.map((c, i) => (
                    <div key={i} className="condition-card">
                      <div className="condition-header">
                        <span className="condition-name">{c.condition_name}</span>
                        <span className={`severity-badge`} style={{ backgroundColor: getSeverityColor(c.severity) }}>
                          {c.severity}
                        </span>
                      </div>
                      <div className="condition-details">
                        <span>Match: {c.matching_symptoms}/{c.total_symptoms} symptoms</span>
                        <span>Probability: {Math.round(c.probability * 100)}%</span>
                        <span>ICD-10: {c.icd10_code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.red_flags?.length > 0 && (
              <div className="result-section red-flags">
                <h4>⚠️ Red Flags - Seek Immediate Care</h4>
                <ul>
                  {result.red_flags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.home_care_advice?.length > 0 && (
              <div className="result-section home-care">
                <h4>🏠 Home Care Advice</h4>
                <ul>
                  {result.home_care_advice.map((advice, i) => (
                    <li key={i}>{advice}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => setResult(null)}>New Check</button>
              {result.recommendation === 'emergency' && (
                <button className="btn btn-danger">🚑 Call Ambulance</button>
              )}
              {result.recommendation === 'clinic' && (
                <button className="btn btn-secondary">📅 Book Appointment</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}