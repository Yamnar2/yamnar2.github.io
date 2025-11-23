// ===================================
// MAIN APPLICATION
// ===================================

const App = {
  currentPage: 'dashboard',

  // Initialize app
  init() {
    this.initTheme();
    // Check authentication
    if (!Auth.isAuthenticated()) {
      this.showLoginPage();
      return;
    }

    this.showMainApp();
    this.initSidebar();
    this.initUTCClock();
    this.navigate('dashboard');
  },

  // Initialize UTC Clock
  initUTCClock() {
    const updateClock = () => {
      const now = new Date();
      // Format: YYYY-MM-DD HH:mm:ss UTC
      const timeString = now.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

      const clockEl = document.getElementById('utcClock');
      if (clockEl) {
        clockEl.textContent = timeString;
      }
    };

    // Clear any existing interval to prevent duplicates
    if (this.clockInterval) clearInterval(this.clockInterval);

    updateClock(); // Initial call
    this.clockInterval = setInterval(updateClock, 1000);
  },

  // Show login page
  showLoginPage() {
    const savedUsername = localStorage.getItem('savedUsername') || '';

    document.body.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo">
              <img src="SNA.png" alt="Logo" style="height: 120px;">
            </div>
            <h1 class="login-title">Sistema de Verificación</h1>
            <p class="login-subtitle">Aeronaves y Pilotos</p>
          </div>
          <form id="loginForm" onsubmit="App.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Usuario</label>
              <input type="text" class="form-input" name="username" value="${savedUsername}" required ${!savedUsername ? 'autofocus' : ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-input" name="password" required ${savedUsername ? 'autofocus' : ''}>
            </div>
            <div id="loginAlert"></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Iniciar Sesión</button>
          </form>
        </div>
      </div>
    `;
  },

  // Handle login
  async handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');

    const result = await Auth.login(username, password);

    if (result.success) {
      this.init();
    } else {
      document.getElementById('loginAlert').innerHTML = `
        <div class="alert alert-danger">
          <span>❌</span>
          <span>${result.message}</span>
        </div>
      `;
    }
  },

  // Show main app
  showMainApp() {
    const user = Auth.getCurrentUser();
    const isAdmin = Auth.isAdmin();

    document.body.innerHTML = `
      <div class="app-container">
        <aside class="sidebar">
          <div class="sidebar-header">
            <button class="sidebar-toggle" onclick="App.toggleSidebar()">
              <span>☰</span>
            </button>
            <div class="logo">
              <img src="SNA.png" alt="VPFS Logo" style="height: 60px; margin-right: 10px;">
              <span>VPFS</span>
            </div>
            <div class="logo-subtitle">Sistema de Verificación Prevuelo</div>
          </div>
          
          <nav>
            <ul class="nav-menu">
              <li class="nav-item">
                <a class="nav-link" data-page="dashboard">
                  <span class="nav-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              ${Auth.hasPermission(PERMISSIONS.VIEW_AIRCRAFT_MODULE) ? `
              <li class="nav-item">
                <a class="nav-link" data-page="aircraft">
                  <span class="nav-icon">✈️</span>
                  <span>Aeronaves</span>
                </a>
              </li>
              ` : ''}
              ${Auth.hasPermission(PERMISSIONS.VIEW_PILOTS_MODULE) ? `
              <li class="nav-item">
                <a class="nav-link" data-page="pilots">
                  <span class="nav-icon">👨‍✈️</span>
                  <span>Pilotos</span>
                </a>
              </li>
              ` : ''}
              ${isAdmin ? `
              <li class="nav-item">
                <a class="nav-link" data-page="users">
                  <span class="nav-icon">👥</span>
                  <span>Usuarios</span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-page="audit-logs">
                  <span class="nav-icon">📋</span>
                  <span>Registro de Auditoría</span>
                </a>
              </li>
              ` : ''}
            </ul>
          </nav>

          <div class="theme-button-container" style="margin-bottom: var(--spacing-md);">
            <button class="btn btn-secondary btn-sm" onclick="App.toggleTheme()">
              <span id="themeIcon">🌙</span>
              <span class="btn-text">Tema</span>
            </button>
          </div>

          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${Auth.hasPermission(PERMISSIONS.MANAGE_USERS) ? 'Administrador' : 'Usuario'}</div>
            <button class="btn btn-secondary btn-sm logout-button" onclick="App.logout()">
              <span class="logout-icon">⏻</span>
              <span class="btn-text">Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <main class="main-content" style="position: relative;">
          <div id="utcClock" style="position: absolute; top: 20px; right: 20px; font-family: monospace; font-size: 1rem; color: var(--text-primary); background: var(--bg-secondary); padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color); z-index: 100;">
            --:--:-- UTC
          </div>
          <div id="alertContainer"></div>
          <div id="pageContent"></div>
        </main>
      </div>
    `;

    // Add navigation event listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        this.navigate(page);
      });
    });
  },

  // Navigate to page
  navigate(page) {
    this.currentPage = page;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === page) {
        link.classList.add('active');
      }
    });

    // Render page content
    const content = document.getElementById('pageContent');

    switch (page) {
      case 'dashboard':
        content.innerHTML = this.renderDashboard();
        break;
      case 'aircraft':
        if (!Auth.hasPermission(PERMISSIONS.VIEW_AIRCRAFT_MODULE)) {
          this.showAlert('danger', 'No tienes permisos para ver el módulo de aeronaves');
          this.navigate('dashboard');
          return;
        }
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Gestión de Aeronaves</h1>
            <p class="page-description">Verificación de certificados y estatus de aeronaves</p>
          </div>
          ${Aircraft.renderList()}
        `;
        break;
      case 'pilots':
        if (!Auth.hasPermission(PERMISSIONS.VIEW_PILOTS_MODULE)) {
          this.showAlert('danger', 'No tienes permisos para ver el módulo de pilotos');
          this.navigate('dashboard');
          return;
        }
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Gestión de Pilotos</h1>
            <p class="page-description">Verificación de licencias y certificados médicos</p>
          </div>
          ${Pilots.renderList()}
        `;
        break;
      case 'users':
        if (!Auth.isAdmin()) {
          this.showAlert('danger', 'No tienes permisos para acceder a esta sección');
          this.navigate('dashboard');
          return;
        }
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Gestión de Usuarios</h1>
            <p class="page-description">Administración de usuarios y roles del sistema</p>
          </div>
          ${Users.renderList()}
        `;
        break;
      case 'audit-logs':
        if (!Auth.isAdmin()) {
          this.showAlert('danger', 'No tienes permisos para acceder a esta sección');
          this.navigate('dashboard');
          return;
        }
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Registro de Auditoría</h1>
            <p class="page-description">Historial de acciones realizadas por los usuarios</p>
          </div>
          ${AuditLogs.renderList()}
        `;
        break;
      default:
        content.innerHTML = '<h1>Página no encontrada</h1>';
    }
  },

  // Render dashboard
  renderDashboard() {
    const user = Auth.getCurrentUser();
    const showAircraft = Auth.hasPermission(PERMISSIONS.VIEW_AIRCRAFT_MODULE);
    const showPilots = Auth.hasPermission(PERMISSIONS.VIEW_PILOTS_MODULE);

    let html = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">Resumen general del sistema</p>
      </div>

      <div class="card mb-2">
        <div class="card-header">
          <h3 class="card-title">Bienvenido, ${user.name}</h3>
        </div>
        <div class="card-body">
          <p>Sistema de verificación de aeronaves y pilotos. Utiliza el menú lateral para navegar entre las diferentes secciones.</p>
        </div>
      </div>
    `;

    if (showAircraft) {
      html += `
        <h2 style="margin-bottom: var(--spacing-lg);">📊 Estadísticas de Aeronaves</h2>
        <div class="stats-grid" id="aircraftDashStats">
          <div class="stat-card">
            <div class="stat-icon">✈️</div>
            <div class="stat-content">
              <div class="stat-label">Total Aeronaves</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-label">Con Deuda</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <div class="stat-label">Certificados Vigentes</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-label">Alertas</div>
              <div class="stat-value">-</div>
            </div>
          </div>
        </div>
      `;
    }

    if (showPilots) {
      html += `
        <h2 style="margin: var(--spacing-2xl) 0 var(--spacing-lg);">👨‍✈️ Estadísticas de Pilotos</h2>
        <div class="stats-grid" id="pilotDashStats">
          <div class="stat-card">
            <div class="stat-icon">👨‍✈️</div>
            <div class="stat-content">
              <div class="stat-label">Total Pilotos</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📜</div>
            <div class="stat-content">
              <div class="stat-label">Licencias Vencidas</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏥</div>
            <div class="stat-content">
              <div class="stat-label">Médicos Vigentes</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-label">Alertas</div>
              <div class="stat-value">-</div>
            </div>
          </div>
        </div>
      `;
    }

    html += `<div id="dashboardAlerts"></div>`;

    // Load stats asynchronously
    setTimeout(async () => {
      const promises = [];
      // Fetch all aircraft to calculate stats client-side for consistency
      if (showAircraft) promises.push(Aircraft.getAll());
      if (showPilots) promises.push(Pilots.getAll());

      const results = await Promise.all(promises);

      let aircraftStats = { total: 0, withDebt: 0, expiredCerts: 0, alerts: 0 };
      let pilotStats = { total: 0, expiredLicense: 0, expiredMedical: 0, alerts: 0 };

      let resultIndex = 0;
      if (showAircraft) {
        const aircraftList = results[resultIndex++];
        aircraftStats.total = aircraftList.length;
        aircraftStats.withDebt = aircraftList.filter(a => a.debt_status !== 'paid').length;
        aircraftStats.expiredCerts = aircraftList.filter(a => {
          const air = Aircraft.getCertStatus(a.airworthiness_expiry).status === 'expired';
          const radio = Aircraft.getCertStatus(a.radio_station_expiry).status === 'expired';
          const insurance = Aircraft.getCertStatus(a.insurance_expiry).status === 'expired';
          return air || radio || insurance;
        }).length;

        // Calculate alerts: Count unique aircraft that have EITHER debt OR expired certs
        aircraftStats.alerts = aircraftList.filter(a => {
          const hasDebt = a.debt_status !== 'paid';
          const hasExpiredCerts =
            Aircraft.getCertStatus(a.airworthiness_expiry).status === 'expired' ||
            Aircraft.getCertStatus(a.radio_station_expiry).status === 'expired' ||
            Aircraft.getCertStatus(a.insurance_expiry).status === 'expired';
          return hasDebt || hasExpiredCerts;
        }).length;
      }

      if (showPilots) {
        // If we fetched all pilots (because showAircraft was true and we did Promise.all), use that list
        // Otherwise fetch them now if we haven't
        let pilotList;
        if (showAircraft) {
          // If showAircraft is true, we fetched Aircraft.getAll() first, so pilots are second
          pilotList = results[resultIndex++];
        } else {
          // If only showPilots is true, pilots are first
          pilotList = results[resultIndex++];
        }

        // If pilotList is not an array (e.g. if we fetched stats instead of list), handle it
        // But we changed the promise to fetch Pilots.getAll() below, so let's make sure we do that

        pilotStats.total = pilotList.length;
        pilotStats.expiredLicense = pilotList.filter(p => Pilots.getCertStatus(p.license_expiry).status === 'expired').length;
        pilotStats.expiredMedical = pilotList.filter(p => Pilots.getCertStatus(p.medical_expiry).status === 'expired').length;

        // Calculate alerts: Count unique pilots that have EITHER expired license OR expired medical
        pilotStats.alerts = pilotList.filter(p => {
          const hasExpiredLicense = Pilots.getCertStatus(p.license_expiry).status === 'expired';
          const hasExpiredMedical = Pilots.getCertStatus(p.medical_expiry).status === 'expired';
          return hasExpiredLicense || hasExpiredMedical;
        }).length;
      }

      // Update aircraft stats
      if (showAircraft) {
        const aircraftGrid = document.getElementById('aircraftDashStats');
        if (aircraftGrid) {
          aircraftGrid.innerHTML = `
            <div class="stat-card">
              <div class="stat-icon">✈️</div>
              <div class="stat-content">
                <div class="stat-label">Total Aeronaves</div>
                <div class="stat-value">${aircraftStats.total}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-content">
                <div class="stat-label">Con Deuda</div>
                <div class="stat-value">${aircraftStats.withDebt}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📋</div>
              <div class="stat-content">
                <div class="stat-label">Cert. Vencidos</div>
                <div class="stat-value">${aircraftStats.expiredCerts}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⚠️</div>
              <div class="stat-content">
                <div class="stat-label">Alertas</div>
                <div class="stat-value">${aircraftStats.alerts}</div>
              </div>
            </div>
          `;
        }
      }

      // Update pilot stats
      if (showPilots) {
        const pilotGrid = document.getElementById('pilotDashStats');
        if (pilotGrid) {
          pilotGrid.innerHTML = `
            <div class="stat-card">
              <div class="stat-icon">👨‍✈️</div>
              <div class="stat-content">
                <div class="stat-label">Total Pilotos</div>
                <div class="stat-value">${pilotStats.total}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📜</div>
              <div class="stat-content">
                <div class="stat-label">Licencias Vencidas</div>
                <div class="stat-value">${pilotStats.expiredLicense}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🏥</div>
              <div class="stat-content">
                <div class="stat-label">Médicos Vencidos</div>
                <div class="stat-value">${pilotStats.expiredMedical}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⚠️</div>
              <div class="stat-content">
                <div class="stat-label">Alertas</div>
                <div class="stat-value">${pilotStats.alerts}</div>
              </div>
            </div>
          `;
        }
      }

      // Show alerts if any
      const totalAlerts = (showAircraft ? aircraftStats.alerts : 0) + (showPilots ? pilotStats.alerts : 0);
      const alertsDiv = document.getElementById('dashboardAlerts');
      if (alertsDiv && totalAlerts > 0) {
        alertsDiv.innerHTML = `
          <div class="alert alert-warning mt-2">
            <span>⚠️</span>
            <span>Hay ${totalAlerts} alertas que requieren atención.</span>
          </div>
        `;
      }
    }, 0);

    return html;
  },

  // Show alert
  showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();

    const alert = `
      <div class="alert alert-${type}" id="${alertId}">
        <span>${type === 'success' ? '✅' : type === 'danger' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;

    alertContainer.insertAdjacentHTML('beforeend', alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      const alertEl = document.getElementById(alertId);
      if (alertEl) {
        alertEl.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => alertEl.remove(), 300);
      }
    }, 5000);
  },

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  },

  // Logout
  async logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      await Auth.logout();
      this.showLoginPage();
    }
  },

  // Toggle Theme
  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    }
  },

  // Initialize Theme
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  // Toggle Sidebar
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  },

  // Initialize Sidebar
  initSidebar() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.add('collapsed');
      }
    }
  },

  // Format date to UTC (Zulu time) for aviation
  formatUTC(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}Z`;
  }
};

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
