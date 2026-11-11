/**
 * Panggung Lokal - API Client & AuthManager
 */

const AuthManager = {
  TOKEN_KEY: 'panggung_lokal_token',
  USER_KEY: 'panggung_lokal_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  },

  getUser() {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isBand() {
    const user = this.getUser();
    return user && user.accountType === 'band';
  },

  isOrganizer() {
    const user = this.getUser();
    return user && user.accountType === 'organizer';
  },

  async logout() {
    this.setToken(null);
    this.setUser(null);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login.html';
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      this.setToken(data.token);
      this.setUser({
        ...data.user,
        bandProfile: data.bandProfile
      });
    }
    return data;
  },

  async register(registerData) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });
    const data = await res.json();
    if (data.success && data.token) {
      this.setToken(data.token);
      this.setUser({
        ...data.user,
        bandProfile: data.bandProfile
      });
    }
    return data;
  },

  renderNavbarAuth() {
    const container = document.getElementById('navbar-auth-container');
    if (!container) return;

    if (this.isAuthenticated()) {
      const user = this.getUser();
      const dashboardLink = user.accountType === 'admin'
        ? '/admin.html'
        : user.accountType === 'band' ? '/dashboard-band.html' : '/dashboard-organizer.html';
      const roleText = user.accountType === 'admin'
        ? 'Admin'
        : user.accountType === 'band' ? 'Band' : 'Penyelenggara';

      container.innerHTML = `
        <span class="navbar__user-badge">${roleText}</span>
        <a href="${dashboardLink}" class="btn btn--secondary btn--sm">
          <span>📊 Dashboard</span>
        </a>
        <button id="btn-logout" class="btn btn--outline btn--sm" onclick="AuthManager.logout()">
          <span>Keluar</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <a href="/login.html" class="btn btn--outline btn--sm">Masuk</a>
        <a href="/register.html" class="btn btn--primary btn--sm">Daftar</a>
      `;
    }
  }
};

// API Helpers
async function apiGetBands(queryParams = {}) {
  const url = new URL('/api/bands/search', window.location.origin);
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  const res = await fetch(url.toString());
  return await res.json();
}

async function apiGetRecentBands(limit = 6) {
  const res = await fetch(`/api/bands/recent?limit=${limit}`);
  return await res.json();
}

async function apiGetBandProfile(id) {
  const res = await fetch(`/api/bands/profile/${id}`);
  return await res.json();
}

async function apiCreateConnection(bandProfileId, notes = '') {
  const res = await fetch('/api/connections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...AuthManager.getAuthHeaders()
    },
    body: JSON.stringify({ bandProfileId, notes })
  });
  return await res.json();
}

async function apiCreateAvailability(startDate, endDate, notes = '') {
  const res = await fetch('/api/availability', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...AuthManager.getAuthHeaders()
    },
    body: JSON.stringify({ startDate, endDate, notes })
  });
  return await res.json();
}

async function apiDeleteAvailability(id) {
  const res = await fetch(`/api/availability/${id}`, {
    method: 'DELETE',
    headers: AuthManager.getAuthHeaders()
  });
  return await res.json();
}

async function apiGetBandDashboard() {
  const res = await fetch('/api/dashboard/band', {
    headers: AuthManager.getAuthHeaders()
  });
  return await res.json();
}

async function apiGetOrganizerDashboard() {
  const res = await fetch('/api/dashboard/organizer', {
    headers: AuthManager.getAuthHeaders()
  });
  return await res.json();
}

async function apiUpdateBandProfile(profileData) {
  const res = await fetch('/api/bands/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...AuthManager.getAuthHeaders()
    },
    body: JSON.stringify(profileData)
  });
  return await res.json();
}

async function apiGetAdminMetrics() {
  const res = await fetch('/api/admin/metrics', { headers: AuthManager.getAuthHeaders() });
  return await res.json();
}

async function apiGetPlatformStats() {
  const res = await fetch('/api/bands/stats');
  return await res.json();
}

async function apiAddBandMedia(mediaData) {
  const res = await fetch('/api/bands/media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...AuthManager.getAuthHeaders()
    },
    body: JSON.stringify(mediaData)
  });
  return await res.json();
}

async function apiDeleteBandMedia(mediaId) {
  const res = await fetch(`/api/bands/media/${mediaId}`, {
    method: 'DELETE',
    headers: AuthManager.getAuthHeaders()
  });
  return await res.json();
}

// Auto init navbar
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.renderNavbarAuth();
  
  // Mobile menu toggle
  const toggleBtn = document.querySelector('.navbar__toggle');
  const menu = document.querySelector('.navbar__menu');
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      menu.classList.toggle('active');
    });
  }
});

window.AuthManager = AuthManager;
window.apiGetBands = apiGetBands;
window.apiGetRecentBands = apiGetRecentBands;
window.apiGetBandProfile = apiGetBandProfile;
window.apiGetPlatformStats = apiGetPlatformStats;
window.apiCreateConnection = apiCreateConnection;
window.apiCreateAvailability = apiCreateAvailability;
window.apiDeleteAvailability = apiDeleteAvailability;
window.apiGetBandDashboard = apiGetBandDashboard;
window.apiGetOrganizerDashboard = apiGetOrganizerDashboard;
window.apiUpdateBandProfile = apiUpdateBandProfile;
window.apiGetAdminMetrics = apiGetAdminMetrics;
window.apiAddBandMedia = apiAddBandMedia;
window.apiDeleteBandMedia = apiDeleteBandMedia;
