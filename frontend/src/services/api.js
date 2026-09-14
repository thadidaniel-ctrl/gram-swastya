const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AUTH_DB = 'GramSwasthyaAuth';
const AUTH_STORE = 'tokens';

// Persist access token to IndexedDB so the service worker can use it
// for notification acknowledgements while offline/backgrounded.
function saveTokenToIndexedDB(accessToken) {
  try {
    const req = indexedDB.open(AUTH_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(AUTH_STORE, 'readwrite');
      const store = tx.objectStore(AUTH_STORE);
      store.put(accessToken, 'accessToken');
    };
  } catch (error) {
    console.error('IndexedDB token save failed:', error);
  }
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      saveTokenToIndexedDB(accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      let response = await fetch(url, config);
      
      if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...config, headers });
        }
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/patient/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    this.clearTokens();
    return false;
  }

  // Patient Auth
  async sendOTP(phone, email, purpose = 'login', language = 'en') {
    return this.request('/patient/auth/send-otp', {
      method: 'POST',
      body: { phone, email, purpose, language },
    });
  }

  async verifyOTP(tempToken, otp) {
    return this.request('/patient/auth/verify-otp', {
      method: 'POST',
      body: { tempToken, otp },
    });
  }

  async registerPatient(data) {
    return this.request('/patient/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async refreshToken() {
    return this.request('/patient/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken: this.refreshToken },
    });
  }

  // Patient Profile
  async getProfile() {
    return this.request('/patient/profile');
  }

  async updateProfile(data) {
    return this.request('/patient/profile', {
      method: 'PUT',
      body: data,
    });
  }

  async getHealthHistory() {
    return this.request('/patient/health-history');
  }

  async addAllergy(allergen) {
    return this.request('/patient/allergies', {
      method: 'POST',
      body: { allergen },
    });
  }

  async removeAllergy(allergen) {
    return this.request(`/patient/allergies/${encodeURIComponent(allergen)}`, {
      method: 'DELETE',
    });
  }

  // Symptom Checker
  async analyzeSymptoms(symptomIds, language = 'en') {
    return this.request('/symptom-checker/analyze', {
      method: 'POST',
      body: { symptom_ids: symptomIds, language },
    });
  }

  // Ambulance
  async bookAmbulance(data) {
    return this.request('/ambulance/book-emergency', {
      method: 'POST',
      body: data,
    });
  }

  // Health Records
  async getHealthRecords(patientId) {
    return this.request(`/health-records/${patientId}`);
  }

  // Medicine Reminders
  async getReminderPreferences() {
    return this.request('/patient/reminders/preferences');
  }

  async updateReminderPreferences(data) {
    return this.request('/patient/reminders/preferences', {
      method: 'PUT',
      body: data,
    });
  }

  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/patient/notifications?${query}`);
  }

  async markNotificationRead(id) {
    return this.request(`/patient/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/patient/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async acknowledgeNotification(id, status) {
    return this.request(`/patient/notifications/${id}/acknowledge`, {
      method: 'POST',
      body: { status },
    });
  }

  async testReminder() {
    return this.request('/patient/reminders/test', {
      method: 'POST',
    });
  }

  // File Storage
  async getFiles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/patient/file-storage?${query}`);
  }

  async getFileStats() {
    return this.request('/patient/file-storage/stats');
  }

  async uploadFiles(formData) {
    return this.request('/patient/file-storage/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDownloadUrl(fileId) {
    return this.request(`/patient/file-storage/${fileId}/download`);
  }

  async getPreviewUrl(fileId) {
    return this.request(`/patient/file-storage/${fileId}/preview`);
  }

  async updateFile(fileId, data) {
    return this.request(`/patient/file-storage/${fileId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFile(fileId) {
    return this.request(`/patient/file-storage/${fileId}`, {
      method: 'DELETE',
    });
  }

  async shareFile(fileId, data) {
    return this.request(`/patient/file-storage/${fileId}/share`, {
      method: 'POST',
      body: data,
    });
  }

  async unshareFile(fileId, doctorId) {
    return this.request(`/patient/file-storage/${fileId}/share/${doctorId}`, {
      method: 'DELETE',
    });
  }

  async createVersion(fileId, formData) {
    return this.request(`/patient/file-storage/${fileId}/version`, {
      method: 'POST',
      body: formData,
    });
  }

  // Folders
  async getFolders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/patient/folders?${query}`);
  }

  async createFolder(data) {
    return this.request('/patient/folders', {
      method: 'POST',
      body: data,
    });
  }

  async updateFolder(folderId, data) {
    return this.request(`/patient/folders/${folderId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFolder(folderId, recursive = false) {
    return this.request(`/patient/folders/${folderId}`, {
      method: 'DELETE',
      body: { recursive },
    });
  }

  async initializeFolders() {
    return this.request('/patient/folders/initialize', {
      method: 'POST',
    });
  }

  async getFolderFiles(folderId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = folderId === 'root' ? '/patient/folders/root/files' : `/patient/folders/${folderId}/files`;
    return this.request(`${path}?${query}`);
  }

  // Doctor list for sharing
  async getDoctorList() {
    return this.request('/doctor/patients?limit=100');
  }

  // Voice Assistant
  async processVoice(audioBase64, language = 'en', context = {}) {
    return this.request('/voice-assistant/process', {
      method: 'POST',
      body: { audio_base64: audioBase64, language, context },
    });
  }

  // Doctor Auth
  async sendDoctorOTP(phone, email, purpose = 'login') {
    return this.request('/doctor/auth/send-otp', {
      method: 'POST',
      body: { phone, email, purpose },
    });
  }

  async verifyDoctorOTP(tempToken, otp) {
    return this.request('/doctor/auth/verify-otp', {
      method: 'POST',
      body: { tempToken, otp },
    });
  }

  // Doctor Dashboard
  async getDoctorDashboard() {
    return this.request('/doctor/dashboard');
  }

  async getDoctorPatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/doctor/patients?${query}`);
  }

  async getDoctorAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/doctor/appointments?${query}`);
  }
}

export const api = new ApiClient();