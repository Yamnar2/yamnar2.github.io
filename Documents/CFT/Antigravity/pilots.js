// ===================================
// PILOT MANAGEMENT MODULE (API Version with Permissions)
// ===================================

const Pilots = {
  // Get all pilots from API
  async getAll() {
    try {
      const result = await API.getPilots();
      return result.success ? result.pilots : [];
    } catch (error) {
      console.error('Error getting pilots:', error);
      return [];
    }
  },

  // Get statistics from API
  async getStats() {
    try {
      const result = await API.getPilotStats();
      if (result.success) {
        const stats = result.stats;
        // Compatibility with old server version
        if (stats.expiredLicense === undefined) {
          stats.expiredLicense = 0; // Default to 0 to avoid undefined
        }
        if (stats.expiredMedical === undefined) {
          stats.expiredMedical = 0;
        }
        return stats;
      }
      return { total: 0, expiredLicense: 0, expiredMedical: 0, alerts: 0 };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, expiredLicense: 0, expiredMedical: 0, alerts: 0 };
    }
  },

  // Create new pilot
  async create(data) {
    try {
      const result = await API.createPilot(data);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al crear piloto' };
    }
  },

  // Update pilot
  async update(id, data) {
    try {
      const result = await API.updatePilot(id, data);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al actualizar piloto' };
    }
  },

  // Delete pilot
  // Delete pilot
  async delete(id) {
    try {
      const result = await API.deletePilot(id);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al eliminar piloto' };
    }
  },

  // Check certificate status
  getCertStatus(expiryDate) {
    if (!expiryDate) return { status: 'unknown', class: 'badge-info', text: 'No Especificado' };

    const today = new Date();
    // Reset to UTC midnight
    today.setUTCHours(0, 0, 0, 0);

    // Parse expiry date as UTC
    const expiryParts = expiryDate.split('-');
    const expiry = new Date(Date.UTC(expiryParts[0], expiryParts[1] - 1, expiryParts[2]));

    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', class: 'badge-danger', text: 'Vencido' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', class: 'badge-warning', text: `Por Vencer (${daysUntilExpiry}d)` };
    } else {
      return { status: 'valid', class: 'badge-success', text: 'Vigente' };
    }
  },

  // Search pilot by name or ID (with audit)
  async searchPilot() {
    const searchInput = document.getElementById('pilotSearch');
    const query = searchInput.value.trim();

    if (!query) {
      App.showAlert('warning', 'Ingrese un nombre o cédula para buscar');
      return;
    }

    try {
      const result = await API.request(`/pilots/search/${encodeURIComponent(query)}`);

      if (result.success && result.pilot) {
        this.displayFilteredPilots([result.pilot]);
        App.showAlert('success', `Piloto encontrado: ${result.pilot.name}`);
      }
    } catch (error) {
      // Don't log 404 to console - it's expected when searching
      if (!error.message || !error.message.includes('404')) {
        console.error('Search error:', error);
      }
      App.showAlert('danger', 'Piloto no encontrado');
      this.displayFilteredPilots([]);
    }
  },

  // Clear search and show all pilots
  async clearSearch() {
    const searchInput = document.getElementById('pilotSearch');
    searchInput.value = '';

    const pilots = await this.getAll();
    this.displayFilteredPilots(pilots);
    App.showAlert('info', 'Búsqueda limpiada');
  },

  // Display filtered pilots list
  displayFilteredPilots(pilots) {
    const tbody = document.getElementById('pilotTableBody');
    if (!tbody) return;

    const canEdit = Auth.hasAnyPermission(
      PERMISSIONS.MANAGE_PILOT_BASIC,
      PERMISSIONS.MANAGE_PILOT_LICENSE,
      PERMISSIONS.MANAGE_PILOT_MEDICAL
    );
    const canDelete = Auth.hasPermission(PERMISSIONS.DELETE_PILOT);

    if (pilots.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron pilotos</td></tr>';
      return;
    }

    tbody.innerHTML = pilots.map(p => {
      const licenseStatus = this.getCertStatus(p.license_expiry);
      const medicalStatus = this.getCertStatus(p.medical_expiry);

      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.id_number}</td>
          <td>${p.license_number} (${p.license_type})</td>
          <td><span class="badge ${licenseStatus.class}">${licenseStatus.text}</span></td>
          <td>${p.medical_cert || '-'}</td>
          <td><span class="badge ${medicalStatus.class}">${medicalStatus.text}</span></td>
          ${canEdit || canDelete ? `
            <td>
              ${canEdit ? `<button class="btn btn-sm btn-secondary" onclick="Pilots.showEditModal(${p.id})">✏️ Editar</button>` : ''}
              ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="Pilots.confirmDelete(${p.id})">🗑️ Eliminar</button>` : ''}
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');
  },

  // Render pilots list
  renderList() {
    const canCreate = Auth.hasPermission(PERMISSIONS.CREATE_PILOT);
    const canDelete = Auth.hasPermission(PERMISSIONS.DELETE_PILOT);
    const canEdit = Auth.hasAnyPermission(
      PERMISSIONS.MANAGE_PILOT_BASIC,
      PERMISSIONS.MANAGE_PILOT_LICENSE,
      PERMISSIONS.MANAGE_PILOT_MEDICAL
    );

    let html = `
      <div class="stats-grid" id="pilotStatsGrid">
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

      <div class="search-bar">
        <input type="text" class="form-input search-input" id="pilotSearch" placeholder="🔍 Buscar por nombre o cédula..." onkeypress="if(event.key==='Enter') Pilots.searchPilot()">
        <button class="btn btn-secondary" onclick="Pilots.searchPilot()">🔍 Buscar</button>
        <button class="btn btn-secondary" onclick="Pilots.clearSearch()" style="margin-left: 5px;">✕ Limpiar</button>
        ${canCreate ? '<button class="btn btn-primary" onclick="Pilots.showCreateModal()">➕ Nuevo Piloto</button>' : ''}
      </div>

      <div class="table-container">
        <table class="table bordered-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>ID</th>
              <th>Licencia</th>
              <th>Vencimiento</th>
              <th>Certificado Médico</th>
              <th>Vencimiento</th>
              ${canEdit || canDelete ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody id="pilotTableBody">
            <tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    setTimeout(async () => {
      const [pilots, stats] = await Promise.all([this.getAll(), this.getStats()]);

      // Calculate stats client-side to ensure consistency and handle stale server response
      const clientStats = {
        total: pilots.length,
        expiredLicense: pilots.filter(p => this.getCertStatus(p.license_expiry).status === 'expired').length,
        expiredMedical: pilots.filter(p => this.getCertStatus(p.medical_expiry).status === 'expired').length,
        alerts: 0 // Will be calculated below
      };

      // Calculate alerts: Count unique pilots that have EITHER expired license OR expired medical
      clientStats.alerts = pilots.filter(p => {
        const hasExpiredLicense = this.getCertStatus(p.license_expiry).status === 'expired';
        const hasExpiredMedical = this.getCertStatus(p.medical_expiry).status === 'expired';
        return hasExpiredLicense || hasExpiredMedical;
      }).length;

      // Use client stats directly for the module view to ensure consistency with the table
      // This ignores the server stats response which might be stale or calculated differently
      const finalStats = clientStats;

      const statsGrid = document.getElementById('pilotStatsGrid');
      if (statsGrid) {
        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-icon">👨‍✈️</div>
            <div class="stat-content">
              <div class="stat-label">Total Pilotos</div>
              <div class="stat-value">${finalStats.total}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📜</div>
            <div class="stat-content">
              <div class="stat-label">Licencias Vencidas</div>
              <div class="stat-value">${finalStats.expiredLicense}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏥</div>
            <div class="stat-content">
              <div class="stat-label">Médicos Vencidos</div>
              <div class="stat-value">${finalStats.expiredMedical}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-label">Alertas</div>
              <div class="stat-value">${finalStats.alerts}</div>
            </div>
          </div>
        `;
      }

      this.displayFilteredPilots(pilots);
    }, 0);

    return html;
  },

  // Show create modal
  showCreateModal() {
    const modal = `
      <div class="modal-overlay" id="pilotModal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Registrar Nuevo Piloto</h3>
            <button class="modal-close" onclick="App.closeModal('pilotModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="pilotForm" onsubmit="Pilots.handleSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nombre Completo *</label>
                  <input type="text" class="form-input" name="name" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Número de Identificación *</label>
                  <input type="text" class="form-input" name="id_number" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" name="email">
                </div>
                <div class="form-group">
                  <label class="form-label">Teléfono</label>
                  <input type="tel" class="form-input" name="phone">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Número de Licencia *</label>
                  <input type="text" class="form-input" name="license_number" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Licencia *</label>
                  <select class="form-select" name="license_type" required>
                    <option value="PPL">PPL - Piloto Privado</option>
                    <option value="CPL">CPL - Piloto Comercial</option>
                    <option value="ATPL">ATPL - Piloto de Transporte</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Vencimiento de Licencia *</label>
                <input type="date" class="form-input" name="license_expiry" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado Médico *</label>
                  <input type="text" class="form-input" name="medical_cert" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento *</label>
                  <input type="date" class="form-input" name="medical_expiry" required>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('pilotModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('pilotForm').requestSubmit()">Registrar Piloto</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Show edit modal
  async showEditModal(pilotId) {
    const pilot = (await this.getAll()).find(p => p.id === pilotId);
    if (!pilot) return;

    const canManageBasic = Auth.hasPermission(PERMISSIONS.MANAGE_PILOT_BASIC);
    const canManageLicense = Auth.hasPermission(PERMISSIONS.MANAGE_PILOT_LICENSE);
    const canManageMedical = Auth.hasPermission(PERMISSIONS.MANAGE_PILOT_MEDICAL);

    const modal = `
      <div class="modal-overlay" id="pilotModal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Editar Piloto</h3>
            <button class="modal-close" onclick="App.closeModal('pilotModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="pilotForm" onsubmit="Pilots.handleSubmit(event, ${pilotId})">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nombre Completo</label>
                  <input type="text" class="form-input" name="name" value="${pilot.name}" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Número de Identificación</label>
                  <input type="text" class="form-input" name="id_number" value="${pilot.id_number}" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" name="email" value="${pilot.email || ''}" ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Teléfono</label>
                  <input type="tel" class="form-input" name="phone" value="${pilot.phone || ''}" ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Número de Licencia</label>
                  <input type="text" class="form-input" name="license_number" value="${pilot.license_number}" required ${!canManageLicense ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Licencia</label>
                  <select class="form-select" name="license_type" required ${!canManageLicense ? 'disabled' : ''}>
                    <option value="PPL" ${pilot.license_type === 'PPL' ? 'selected' : ''}>PPL - Piloto Privado</option>
                    <option value="CPL" ${pilot.license_type === 'CPL' ? 'selected' : ''}>CPL - Piloto Comercial</option>
                    <option value="ATPL" ${pilot.license_type === 'ATPL' ? 'selected' : ''}>ATPL - Piloto de Transporte</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Vencimiento de Licencia</label>
                <input type="date" class="form-input" name="license_expiry" value="${pilot.license_expiry}" required ${!canManageLicense ? 'disabled' : ''}>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado Médico</label>
                  <input type="text" class="form-input" name="medical_cert" value="${pilot.medical_cert}" required ${!canManageMedical ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="medical_expiry" value="${pilot.medical_expiry}" required ${!canManageMedical ? 'disabled' : ''}>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('pilotModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('pilotForm').requestSubmit()">Guardar Cambios</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Handle form submit
  async handleSubmit(event, pilotId = null) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    let result;
    if (pilotId) {
      result = await this.update(pilotId, data);
    } else {
      result = await this.create(data);
    }

    if (result.success) {
      App.closeModal('pilotModal');
      App.showAlert('success', pilotId ? 'Piloto actualizado correctamente' : 'Piloto registrado correctamente');
      App.navigate('pilots');
    } else {
      App.showAlert('danger', result.message);
    }
  },

  // Confirm delete
  async confirmDelete(pilotId) {
    const pilot = (await this.getAll()).find(p => p.id === pilotId);
    if (!pilot) return;

    if (confirm(`¿Estás seguro de eliminar al piloto "${pilot.name}"?`)) {
      const result = await this.delete(pilotId);
      if (result.success) {
        App.showAlert('success', 'Piloto eliminado correctamente');
        App.navigate('pilots');
      } else {
        App.showAlert('danger', result.message);
      }
    }
  }
};
