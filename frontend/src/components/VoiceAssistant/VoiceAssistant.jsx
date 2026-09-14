import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  saveConversation, 
  getConversations, 
  cacheResponse, 
  getCachedResponse,
  getOfflineResponse,
  isOnline,
  setupOnlineListener,
  OFFLINE_PATTERNS
} from '../../services/offlineVoice';

export default function VoiceAssistant() {
  const { patient } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [sessionId] = useState(`voice_${patient?.id}_${Date.now()}`);
  const [showHistory, setShowHistory] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const patientDataRef = useRef(null);

  useEffect(() => {
    setIsOnlineStatus(isOnline());
    patientDataRef.current = patient;
    
    const cleanup = setupOnlineListener((e) => {
      const online = e.type === 'online';
      setIsOnlineStatus(online);
      if (online) {
        setOfflineMode(false);
        syncPendingConversations();
      } else {
        setOfflineMode(true);
      }
    });
    
    loadConversationHistory();
    return cleanup;
  }, []);

  const loadConversationHistory = async () => {
    try {
      const history = await getConversations(20);
      setConversation(history.reverse());
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const syncPendingConversations = async () => {
    // Sync logic would go here
    console.log('Syncing pending conversations...');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        await processVoice(base64);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      setTranscript('');
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    }
    setIsRecording(false);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processVoice = async (audioBase64) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simulate transcript (in production, use STT)
      const simulatedTranscript = simulateTranscript(audioBase64, language);
      setTranscript(simulatedTranscript);
      
      let result;
      let fromCache = false;
      let patternMatched = null;
      let offline = false;

      if (!isOnlineStatus) {
        // Offline mode - use IndexedDB cached responses
        const offlineResult = await getOfflineResponse(simulatedTranscript, patientDataRef.current);
        result = offlineResult;
        offline = true;
        setOfflineMode(true);
      } else {
        // Check local cache first
        const cached = await getCachedResponse(simulatedTranscript, language);
        if (cached) {
          result = cached;
          fromCache = true;
        } else {
          // Call API
          const apiResult = await api.processVoice(audioBase64, language, {
            patientId: patient?.id,
            patientName: patient?.name,
          });
          result = apiResult;
          
          // Cache the response
          await cacheResponse(simulatedTranscript, language, result);
        }
      }

      // Add to conversation
      const userMsg = { type: 'user', text: simulatedTranscript, timestamp: Date.now() };
      const assistantMsg = { 
        type: 'assistant', 
        text: result.text_response, 
        intent: result.intent, 
        actions: result.actions,
        fromCache,
        patternMatched: result.patternMatched,
        offline,
        timestamp: Date.now(),
      };

      setConversation(prev => [...prev, userMsg, assistantMsg]);
      
      // Save to IndexedDB
      await saveConversation({
        sessionId,
        userMessage: simulatedTranscript,
        assistantResponse: result.text_response,
        intent: result.intent,
        fromCache,
        patternMatched,
        offline,
        timestamp: Date.now(),
      });

      // Execute actions
      if (result.actions) {
        handleActions(result.actions);
      }
      
      if (result.requires_handoff) {
        setError(`Doctor handoff needed: ${result.handoff_reason}`);
      }

      setResponse(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActions = (actions) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'navigate':
          if (action.payload?.screen === 'symptom_checker') {
            window.location.href = '/symptom-checker';
          }
          break;
        case 'book_appointment':
          window.location.href = '/appointments';
          break;
        case 'call_ambulance':
          window.location.href = '/ambulance';
          break;
      }
    });
  };

  const getVisualizerData = () => {
    if (!analyserRef.current) return [];
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return Array.from(dataArray).slice(0, 30);
  };

  const simulateTranscript = (audioBase64, lang) => {
    // In production, use Speech-to-Text API
    // For demo, return sample based on audio length
    const samples = {
      en: [
        "What medicines do I need to take today?",
        "When is my next appointment?",
        "Show my health records",
        "I have chest pain and difficulty breathing",
        "Book appointment with cardiologist",
        "Call ambulance emergency",
        "Set reminder for blood pressure medicine",
      ],
      hi: [
        "आज मुझे कौन सी दवाई लेनी है?",
        "मेरा अगला अपॉइंटमेंट कब है?",
        "मेरे स्वास्थ्य रिकॉर्ड दिखाओ",
        "मेरी छाती में दर्द है",
      ],
      te: [
        "నాకు ఈరోజు ఏ మందులు తీసుకోవాలి?",
        "నా పేर्शनల్ ఇంటరవ్యూ ఎప్పుడు?",
      ],
      ta: [
        "இன்று எனக்கு எந்த மருந்துகள்?",
        "என் அடுத்த நேர்காணல் எப்போது?",
      ],
      mr: [
        "आज मी कोणती औषध घ्यावी?",
        "माझं पुढील अपॉइंटमेंट केव्हा आहे?",
      ],
    };
    
    const langSamples = samples[lang] || samples.en;
    return langSamples[Math.floor(Math.random() * langSamples.length)];
  };

  const getVisualizerData = () => {
    if (!analyserRef.current) return [];
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return Array.from(dataArray).slice(0, 30);
  };

  return (
    <div className="voice-assistant">
      <div className="assistant-header">
        <h2>🎤 Voice Assistant</h2>
        <div className="header-status">
          <span className={`connection-status ${isOnlineStatus ? 'online' : 'offline'}`}>
            {isOnlineStatus ? '🟢 Online' : '🔴 Offline'}
          </span>
          {offlineMode && <span className="offline-badge">💾 Offline Mode</span>}
        </div>
        <div className="language-selector">
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="te">తెలుగు</option>
            <option value="ta">தமிழ்</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
      </div>

      <div className="assistant-main">
        <div className="conversation-panel">
          {showHistory && (
            <div className="history-toggle" onClick={() => setShowHistory(false)}>
              <span>← Back to Assistant</span>
            </div>
          )}

          <div className="conversation-history">
            {showHistory ? (
              <div className="history-list">
                <h4>Recent Conversations</h4>
                {conversation.length === 0 ? (
                  <p className="empty">No conversation history</p>
                ) : (
                  conversation.map((msg, i) => (
                    <div key={i} className={`history-item ${msg.type}`}>
                      <span className="history-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="history-text">{msg.text?.substring(0, 100)}...</span>
                      {msg.offline && <span className="offline-indicator">💾</span>}
                      {msg.fromCache && <span className="cache-indicator">⚡</span>}
                    </div>
                  ))
                )}
              </div>
            ) : (
              conversation.map((msg, i) => (
                <div key={i} className={`message ${msg.type}`}>
                  <div className="message-avatar">
                    {msg.type === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <p>{msg.text || msg.text_response}</p>
                    {msg.intent && <span className="message-intent">Intent: {msg.intent}</span>}
                    {msg.actions && msg.actions.map((a, j) => (
                      <span key={j} className="action-badge">{a.description}</span>
                    ))}
                    <div className="message-meta">
                      {msg.offline && <span className="meta-badge offline">💾 Offline</span>}
                      {msg.fromCache && <span className="meta-badge cache">⚡ Cached</span>}
                      {msg.patternMatched && <span className="meta-badge pattern">🎯 {msg.patternMatched}</span>}
                    </div>
                  </div>
                </div>
              ))}
            )}

            <div className="recording-controls">
              <div className="visualizer">
                {getVisualizerData().map((value, i) => (
                  <div 
                    key={i} 
                    className="bar" 
                    style={{ 
                      height: `${Math.max(5, (value / 255) * 100)}%`,
                      animationDelay: `${i * 50}ms`
                    }} 
                  />
                ))}
              </div>

              <div className="status-text">
                {isRecording ? '🎙️ Listening...' : isProcessing ? '🤔 Processing...' : isOnlineStatus ? 'Tap to speak' : '🔴 Offline - Tap for offline mode'}
              </div>

              <button 
                className={`mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''} ${!isOnlineStatus ? 'offline' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>

              {error && <div className="alert alert-error">{error}</div>}
            </div>
          </div>

          <div className="quick-prompts">
            <h4>Try saying:</h4>
            <div className="prompt-chips">
              {[
                "What medicines do I need to take today?",
                "When is my next appointment?",
                "Show my health records",
                "I have chest pain and difficulty breathing",
                "Book appointment with cardiologist",
                "Call ambulance emergency",
                "Set reminder for blood pressure medicine",
              ].map(prompt => (
                <button key={prompt} className="prompt-chip" onClick={() => setTranscript(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            
            <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '🎤 Back to Assistant' : '📜 View History'}
            </button>
          </div>
        </div>

        <div className="cache-info">
          <h4>💾 Cache & Offline Status</h4>
          <div className="cache-stats">
            <div className="stat">
              <span className="stat-value">🟢</span>
              <span className="stat-label">Online</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Object.keys(OFFLINE_PATTERNS).length}</span>
              <span className="stat-label">Offline Patterns</span>
            </div>
            <div className="stat">
              <span className="stat-value">💾</span>
              <span className="stat-label">IndexedDB Ready</span>
            </div>
          </div>
          
          <h4>Supported Offline Queries:</h4>
          <ul className="pattern-list">
            {Object.entries(OFFLINE_PATTERNS).map(([key, pattern]) => (
              <li key={key}>
                <strong>{key}:</strong> {pattern.keywords.slice(0, 3).join(', ')}...
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}