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
    return user && (user.accountType === 'organizer' || user.accountType === 'general');
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
    const menu = document.querySelector('.navbar__menu');
    if (!container) return;

    let desktopHtml = '';
    let mobileHtml = '';

    if (this.isAuthenticated()) {
      const user = this.getUser() || {};
      const isBand = user.accountType === 'band';
      const isAdmin = user.accountType === 'admin';

      const roleBadge = isAdmin ? 'Admin' : isBand ? 'Musisi' : 'EO / Umum';
      
      const primaryActionHtml = isBand
        ? `<a href="/dashboard-band.html" class="btn btn--secondary btn--sm"><span>🎸 Dashboard Band</span></a>`
        : isAdmin
        ? `<a href="/admin.html" class="btn btn--secondary btn--sm"><span>📊 Admin KPI</span></a>`
        : `<a href="/search.html" class="btn btn--secondary btn--sm"><span>🔍 Cari Band</span></a>`;

      const primaryActionMobileHtml = isBand
        ? `<a href="/dashboard-band.html" class="btn btn--secondary btn--block"><span>🎸 Dashboard Band</span></a>`
        : isAdmin
        ? `<a href="/admin.html" class="btn btn--secondary btn--block"><span>📊 Admin KPI</span></a>`
        : `<a href="/search.html" class="btn btn--secondary btn--block"><span>🔍 Cari Band</span></a>`;

      desktopHtml = `
        <span class="navbar__user-badge">${roleBadge}</span>
        ${primaryActionHtml}
        <button id="btn-logout" class="btn btn--outline btn--sm" onclick="AuthManager.logout()">
          <span>Keluar</span>
        </button>
      `;

      const safeUserLabel = typeof escapeHtml === 'function'
        ? escapeHtml(user.name || user.email || '')
        : String(user.name || user.email || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      mobileHtml = `
        <div class="navbar__mobile-user-info">
          <span class="navbar__user-badge">${roleBadge}</span>
          <span style="font-size: 0.85rem; color: var(--graphite); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeUserLabel}</span>
        </div>
        ${primaryActionMobileHtml}
        <button id="btn-logout-mobile" class="btn btn--outline btn--block" onclick="AuthManager.logout()">
          <span>Keluar</span>
        </button>
      `;
    } else {
      desktopHtml = `
        <a href="/login.html" class="btn btn--outline btn--sm">Masuk</a>
        <a href="/register.html" class="btn btn--primary btn--sm">Daftar</a>
      `;

      mobileHtml = `
        <a href="/login.html" class="btn btn--outline btn--block">Masuk</a>
        <a href="/register.html" class="btn btn--primary btn--block">Daftar</a>
      `;
    }

    container.innerHTML = desktopHtml;

    if (menu) {
      let mobileAuthLi = menu.querySelector('.navbar__menu-auth-item');
      if (!mobileAuthLi) {
        mobileAuthLi = document.createElement('li');
        mobileAuthLi.className = 'navbar__menu-auth-item';
        menu.appendChild(mobileAuthLi);
      }
      mobileAuthLi.innerHTML = `<div class="navbar__menu-auth">${mobileHtml}</div>`;
    }
  }
};

/**
 * Clean HTTP client helper for API calls
 * @private
 */
async function apiClient(endpoint, options = {}) {
  const { method = 'GET', data, requiresAuth = false, headers = {} } = options;
  const config = {
    method,
    headers: {
      ...(requiresAuth ? AuthManager.getAuthHeaders() : {}),
      ...headers
    }
  };

  if (data !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(data);
  }

  const res = await fetch(endpoint, config);
  return await res.json();
}

// API Functions
async function apiGetBands(queryParams = {}) {
  const url = new URL('/api/bands/search', window.location.origin);
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  return apiClient(url.toString(), { requiresAuth: true });
}

async function apiGetRecentBands(limit = 6) {
  return apiClient(`/api/bands/recent?limit=${limit}`, { requiresAuth: true });
}

async function apiGetBandProfile(id) {
  return apiClient(`/api/bands/profile/${id}`, { requiresAuth: true });
}

async function apiGetPlatformStats() {
  return apiClient('/api/bands/stats');
}

async function apiUpdateBandProfile(profileData) {
  return apiClient('/api/bands/profile', {
    method: 'PUT',
    data: profileData,
    requiresAuth: true
  });
}

async function apiAddBandMedia(mediaData) {
  return apiClient('/api/bands/media', {
    method: 'POST',
    data: mediaData,
    requiresAuth: true
  });
}

async function apiDeleteBandMedia(mediaId) {
  return apiClient(`/api/bands/media/${mediaId}`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

// Instagram-Style Band Posts API Client
async function apiGetBandPosts(bandId) {
  return apiClient(`/api/posts/band/${bandId}`);
}

async function apiCreateBandPost(postData) {
  return apiClient('/api/posts', {
    method: 'POST',
    data: postData,
    requiresAuth: true
  });
}

async function apiDeleteBandPost(postId) {
  return apiClient(`/api/posts/${postId}`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

async function apiTrackPostView(postId) {
  try {
    return await apiClient(`/api/posts/${postId}/view`, { method: 'POST' });
  } catch (e) {
    return { success: false };
  }
}

async function apiTrackPostWaClick(postId) {
  return apiClient(`/api/posts/${postId}/wa-click`, { method: 'POST' });
}

async function apiGetMyPostsPerformance() {
  return apiClient('/api/posts/my-performance', { requiresAuth: true });
}

async function apiCreateConnection(bandProfileId, notes = '') {
  return apiClient('/api/connections', {
    method: 'POST',
    data: { bandProfileId, notes },
    requiresAuth: true
  });
}

async function apiGetBandDashboard() {
  return apiClient('/api/dashboard/band', { requiresAuth: true });
}

async function apiGetOrganizerDashboard() {
  return apiClient('/api/dashboard/organizer', { requiresAuth: true });
}

async function apiGetAdminMetrics() {
  return apiClient('/api/admin/metrics', { requiresAuth: true });
}

// Auto init navbar
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.renderNavbarAuth();
  
  // Mobile menu toggle & accessible handling
  const toggleBtn = document.querySelector('.navbar__toggle');
  const menu = document.querySelector('.navbar__menu');
  if (toggleBtn && menu) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = menu.classList.toggle('active');
      toggleBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (menu.classList.contains('active') && !menu.contains(e.target) && e.target !== toggleBtn) {
        menu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        menu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
      }
    });
  }
});

// Window assignments for HTML scripts
window.AuthManager = AuthManager;
window.apiGetBands = apiGetBands;
window.apiGetRecentBands = apiGetRecentBands;
window.apiGetBandProfile = apiGetBandProfile;
window.apiGetBandPosts = apiGetBandPosts;
window.apiCreateBandPost = apiCreateBandPost;
window.apiDeleteBandPost = apiDeleteBandPost;
window.apiTrackPostView = apiTrackPostView;
window.apiTrackPostWaClick = apiTrackPostWaClick;
window.apiGetMyPostsPerformance = apiGetMyPostsPerformance;
window.apiGetPlatformStats = apiGetPlatformStats;
window.apiCreateConnection = apiCreateConnection;
window.apiGetBandDashboard = apiGetBandDashboard;
window.apiGetOrganizerDashboard = apiGetOrganizerDashboard;
window.apiUpdateBandProfile = apiUpdateBandProfile;
window.apiGetAdminMetrics = apiGetAdminMetrics;
window.apiAddBandMedia = apiAddBandMedia;
window.apiDeleteBandMedia = apiDeleteBandMedia;
