// ===================================
// AUDIT LOGS MODULE
// ===================================

const AuditLogs = {
  // Get audit logs with filters
  async getLogs(filters = {}) {
    try {
      const result = await API.getAuditLogs(filters);
      return result.success ? result.logs : [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  },

  // Get action label
  getActionLabel(action) {
    const labels = {
      'VIEW': '👁️ Ver',
      'CREATE': '➕ Crear',
      'UPDATE': '✏️ Editar',
      'DELETE': '🗑️ Eliminar',
      'LOGIN': '🔐 Inicio de sesión',
      'LOGOUT': '🚪 Cierre de sesión'
    };
    return labels[action] || action;
  },

  // Get resource label
  getResourceLabel(resource) {
    const labels = {
      'aircraft': '✈️ Aeronave',
      'pilot': '👨‍✈️ Piloto',
      'user': '👤 Usuario',
      'auth': '🔐 Autenticación'
    };
    return labels[resource] || resource;
  },

  // Format date
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  // Format details for display
  formatDetails(log) {
    if (!log.details) return '-';

    // Handle search queries (both found and not found)
    if (log.details.searchQuery) {
      const resourceLabel = log.resource === 'aircraft' ? 'Matrícula' : 'Piloto';
      if (log.details.notFound) {
        return `<strong>Búsqueda de ${resourceLabel}:</strong> "${log.details.searchQuery}" <span style="color: #dc3545;">(No encontrado)</span>`;
      } else if (log.details.found) {
        return `<strong>Búsqueda de ${resourceLabel}:</strong> "${log.details.searchQuery}" <span style="color: #28a745;">(Encontrado)</span>`;
      }
    }

    if (log.action === 'UPDATE' && log.details.changes) {
      const changes = log.details.changes;
      const changeList = Object.keys(changes).map(key => {
        const before = changes[key].before ?? 'null';
        const after = changes[key].after ?? 'null';
        return `<strong>${key}:</strong> ${before} → ${after}`;
      }).join('<br>');
      return changeList || 'Sin cambios';
    } else if (log.action === 'CREATE' && log.details.data) {
      return 'Registro creado';
    } else if (log.action === 'DELETE' && log.details.deletedData) {
      return 'Registro eliminado';
    }

    return '-';
  },

  // Render audit logs list
  renderList() {
    let html = `
      <div class="audit-filters">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Acción</label>
            <select class="form-select" id="filterAction">
              <option value="">Todas</option>
              <option value="VIEW">Ver</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Editar</option>
              <option value="DELETE">Eliminar</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Recurso</label>
            <select class="form-select" id="filterResource">
              <option value="">Todos</option>
              <option value="aircraft">Aeronaves</option>
              <option value="pilot">Pilotos</option>
              <option value="user">Usuarios</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary" onclick="AuditLogs.applyFilters()">🔍 Filtrar</button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table class="table bordered-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Nombre/ID</th>
              <th>IP</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody id="auditLogsTableBody">
            <tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Load data asynchronously
    setTimeout(async () => {
      await this.loadLogs();
    }, 0);

    return html;
  },

  // Apply filters
  async applyFilters() {
    const action = document.getElementById('filterAction').value;
    const resource = document.getElementById('filterResource').value;

    const filters = {};
    if (action) filters.action = action;
    if (resource) filters.resource = resource;

    await this.loadLogs(filters);
  },

  // Load logs
  async loadLogs(filters = {}) {
    filters.limit = 50; // Limit to last 50 logs

    const logs = await this.getLogs(filters);

    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron registros</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const resourceIdentifier = log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-');
      const timestamp = log.created_at || log.createdAt;

      return `
        <tr>
          <td>${this.formatDate(timestamp)}</td>
          <td><strong>${log.username}</strong></td>
          <td>${this.getActionLabel(log.action)}</td>
          <td>${this.getResourceLabel(log.resource)}</td>
          <td>${resourceIdentifier}</td>
          <td>${log.ipAddress || '-'}</td>
          <td style="max-width: 300px; font-size: 0.85em; white-space: normal; word-break: break-word;">${this.formatDetails(log)}</td>
        </tr>
      `;
    }).join('');
  }
};
