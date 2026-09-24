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

  buildQuery(params = {}) {
    const clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      clean[k] = Array.isArray(v) ? v.join(',') : v;
    }
    return new URLSearchParams(clean).toString();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    const isDoctorEndpoint = endpoint.startsWith('/doctor');
    const accessToken = isDoctorEndpoint
      ? localStorage.getItem('doctorAccessToken')
      : this.accessToken;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let body = options.body;
    if (!isFormData && body && typeof body === 'object') {
      body = JSON.stringify(body);
    }

    const config = {
      ...options,
      headers,
      body,
    };

    const timeoutMs = options.timeout || 30000;
    const maxAttempts = options.retry === false ? 1 : 2;
    const method = (options.method || 'GET').toUpperCase();
    const isRetrySafe =
      method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ||
      method === 'PUT' || method === 'DELETE';

    const fetchWithTimeout = (timeout = timeoutMs) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      return fetch(url, { ...config, signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        let response = await fetchWithTimeout();

        if (response.status === 401 && !endpoint.includes('/auth/')) {
          const refreshToken = isDoctorEndpoint
            ? localStorage.getItem('doctorRefreshToken')
            : this.refreshToken;
          if (refreshToken) {
            const refreshed = isDoctorEndpoint
              ? await this._refreshDoctorTokenOnce()
              : await this._refreshPatientTokenOnce();
            if (refreshed) {
              const retryToken = isDoctorEndpoint
                ? localStorage.getItem('doctorAccessToken')
                : this.accessToken;
              headers['Authorization'] = `Bearer ${retryToken}`;
              response = await this._fetchWithTimeout(url, { ...config, headers }, timeoutMs);
            }
          }
        }

        if (response.status === 204) return { success: true };

        const text = await response.text();
        let data = { success: response.ok };
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            data = { success: response.ok, message: 'Unexpected response from server' };
          }
        }

        if (response.status >= 500 && isRetrySafe && attempt + 1 < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }

        if (data && data.offline) {
          const offlineError = new Error(data.message || 'You are offline');
          offlineError.offline = true;
          throw offlineError;
        }

        if (!response.ok) {
          throw new Error(data.message || 'API request failed');
        }

        return data;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (error instanceof TypeError && isRetrySafe && attempt + 1 < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  _fetchWithTimeout(url, config, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...config, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  _refreshPatientTokenOnce() {
    if (!this._patientRefreshPromise) {
      this._patientRefreshPromise = this.refreshAccessToken().finally(() => {
        this._patientRefreshPromise = null;
      });
    }
    return this._patientRefreshPromise;
  }

  _refreshDoctorTokenOnce() {
    if (!this._doctorRefreshPromise) {
      this._doctorRefreshPromise = this.refreshDoctorAccessToken().finally(() => {
        this._doctorRefreshPromise = null;
      });
    }
    return this._doctorRefreshPromise;
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

  async refreshDoctorAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/doctor/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('doctorRefreshToken') }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('doctorAccessToken', data.accessToken);
        localStorage.setItem('doctorRefreshToken', data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Doctor token refresh failed:', error);
    }

    localStorage.removeItem('doctorAccessToken');
    localStorage.removeItem('doctorRefreshToken');
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

  async updateFCMToken(fcmToken) {
    return this.request('/patient/profile/fcm-token', {
      method: 'PUT',
      body: { fcmToken },
    });
  }

  async updateWebPushToken(webPushEndpoint, webPushSubscription) {
    return this.request('/patient/profile/webpush-token', {
      method: 'PUT',
      body: { webPushEndpoint, webPushSubscription },
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

  // Ambulance — routes to real /emergency/call backend
  async bookAmbulance(data) {
    return this.request('/emergency/call', {
      method: 'POST',
      body: data,
    });
  }

  // Health Records — real backend endpoint returns { success, healthHistory: {...} }
  async getHealthRecords() {
    const body = await this.request('/patient/health-history');
    return body?.healthHistory;
  }

  // Medicines — real backend CRUD at /patient/medicines
  async getMedicines() {
    return this.request('/patient/medicines');
  }

  async createMedicine(data) {
    return this.request('/patient/medicines', {
      method: 'POST',
      body: data,
    });
  }

  async updateMedicine(id, data) {
    return this.request(`/patient/medicines/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteMedicine(id) {
    return this.request(`/patient/medicines/${id}`, {
      method: 'DELETE',
    });
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
    const query = this.buildQuery(params);
    return this.request(`/patient/notifications${query ? `?${query}` : ''}`);
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
    const query = this.buildQuery(params);
    return this.request(`/patient/file-storage${query ? `?${query}` : ''}`);
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
    const query = this.buildQuery(params);
    return this.request(`/patient/folders${query ? `?${query}` : ''}`);
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
    return this.request(`/patient/folders/${folderId}?recursive=${recursive}`, {
      method: 'DELETE',
    });
  }

  async initializeFolders() {
    return this.request('/patient/folders/initialize', {
      method: 'POST',
    });
  }

  async getFolderFiles(folderId, params = {}) {
    const query = this.buildQuery(params);
    const qs = query ? `?${query}` : '';
    if (folderId === 'root' || folderId === null || folderId === undefined) {
      return this.getFiles({ ...params });
    }
    return this.request(`/patient/folders/${folderId}/files${qs}`);
  }

  // Doctor list for sharing
  async getDoctorList() {
    return this.request('/patient/doctors/directory');
  }

  // Patient Appointments
  async getAppointments(params = {}) {
    const query = this.buildQuery(params);
    return this.request(`/patient/appointments${query ? `?${query}` : ''}`);
  }

  async getAppointmentDetail(appointmentId) {
    return this.request(`/patient/appointments/${appointmentId}`);
  }

  async bookAppointment(data) {
    return this.request('/patient/appointments', {
      method: 'POST',
      body: data,
    });
  }

  async cancelAppointment(appointmentId, reason) {
    return this.request(`/patient/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  }

  // Voice Assistant
  async processVoice(audioBase64, language = 'en', context = {}) {
    return this.request('/voice-assistant/process', {
      method: 'POST',
      body: { audio_base64: audioBase64, language, context },
    });
  }

  async syncVoiceConversations(conversations) {
    return this.request('/voice-assistant/sync', {
      method: 'POST',
      body: { conversations },
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
    const query = this.buildQuery(params);
    return this.request(`/doctor/patients${query ? `?${query}` : ''}`);
  }

  async getDoctorAppointments(params = {}) {
    const query = this.buildQuery(params);
    return this.request(`/doctor/appointments${query ? `?${query}` : ''}`);
  }

  // Doctor Shared Files (files patients shared with this doctor)
  async getDoctorSharedFiles(params = {}) {
    const query = this.buildQuery(params);
    return this.request(`/doctor/shared-files${query ? `?${query}` : ''}`);
  }

  async getDoctorSharedFilePreview(fileId) {
    return this.request(`/doctor/shared-files/${fileId}/preview`);
  }

  async getDoctorSharedFileDownload(fileId) {
    return this.request(`/doctor/shared-files/${fileId}/download`);
  }
}

export const api = new ApiClient();