// ===================================
// API CLIENT MODULE
// ===================================

const API = {
    baseURL: 'http://localhost:3000/api',
    token: null,

    // Initialize - load token from localStorage
    init() {
        this.token = localStorage.getItem('authToken');
    },

    // Set authorization header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    },

    // Generic request method
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: this.getHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Authentication
    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.success && data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
        }

        return data;
    },

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Save username for next login
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                try {
                    const user = JSON.parse(currentUser);
                    if (user.username) {
                        localStorage.setItem('savedUsername', user.username);
                    }
                } catch (e) {
                    console.error('Error saving username:', e);
                }
            }

            this.token = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    },

    async getCurrentUser() {
        return await this.request('/auth/me');
    },

    // Users
    async getUsers() {
        return await this.request('/users');
    },

    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async updateUser(id, userData) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    },

    // Aircraft
    async getAircraft() {
        return await this.request('/aircraft');
    },

    async getAircraftStats() {
        return await this.request('/aircraft/stats');
    },

    async getAircraftById(id) {
        return await this.request(`/aircraft/${id}`);
    },

    async createAircraft(aircraftData) {
        return await this.request('/aircraft', {
            method: 'POST',
            body: JSON.stringify(aircraftData)
        });
    },

    async updateAircraft(id, aircraftData) {
        return await this.request(`/aircraft/${id}`, {
            method: 'PUT',
            body: JSON.stringify(aircraftData)
        });
    },

    async deleteAircraft(id) {
        return await this.request(`/aircraft/${id}`, {
            method: 'DELETE'
        });
    },

    // Pilots
    async getPilots() {
        return await this.request('/pilots');
    },

    async getPilotStats() {
        return await this.request('/pilots/stats');
    },

    async getPilotById(id) {
        return await this.request(`/pilots/${id}`);
    },

    async createPilot(pilotData) {
        return await this.request('/pilots', {
            method: 'POST',
            body: JSON.stringify(pilotData)
        });
    },

    async updatePilot(id, pilotData) {
        return await this.request(`/pilots/${id}`, {
            method: 'PUT',
            body: JSON.stringify(pilotData)
        });
    },

    async deletePilot(id) {
        return await this.request(`/pilots/${id}`, {
            method: 'DELETE'
        });
    },

    // Audit Logs
    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/audit-logs?${params}`);
    },

    async getAuditLogStats() {
        return await this.request('/audit-logs/stats');
    }
};

// Initialize API on load
API.init();
