// ===================================
// USER MANAGEMENT MODULE (API Version with Permissions)
// ===================================

const Users = {
  // Get all users from API
  async getAll() {
    try {
      const result = await API.getUsers();
      return result.success ? result.users : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  // Create new user
  async create(userData) {
    try {
      const result = await API.createUser(userData);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al crear usuario' };
    }
  },

  // Update user
  async update(id, userData) {
    try {
      const result = await API.updateUser(id, userData);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al actualizar usuario' };
    }
  },

  // Delete user
  async delete(id) {
    try {
      const result = await API.deleteUser(id);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al eliminar usuario' };
    }
  },

  // Render users list
  renderList() {
    const currentUser = Auth.getCurrentUser();
    const hasManageUsers = Auth.hasPermission(PERMISSIONS.MANAGE_USERS);

    let html = `
      <div class="search-bar">
        <input type="text" class="form-input search-input" id="userSearch" placeholder="🔍 Buscar usuarios...">
        ${hasManageUsers ? '<button class="btn btn-primary" onclick="Users.showCreateModal()">➕ Nuevo Usuario</button>' : ''}
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Permisos</th>
              <th>Fecha Creación</th>
              ${hasManageUsers ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody id="usersTableBody">
            <tr><td colspan="5" style="text-align: center;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Load users asynchronously
    setTimeout(async () => {
      const users = await this.getAll();
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;

      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(user => {
        const permissionCount = user.permissions ? user.permissions.length : 0;
        const date = new Date(user.created_at).toLocaleDateString('es-ES');
        const isCurrentUser = user.id === currentUser.id;

        return `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td>${user.name}</td>
            <td>
              <span class="badge badge-info">${permissionCount} permisos</span>
              ${user.permissions && user.permissions.includes(PERMISSIONS.MANAGE_USERS) ? '<span class="badge badge-warning">Admin</span>' : ''}
            </td>
            <td>${date}</td>
            ${hasManageUsers ? `
              <td>
                <button class="btn btn-sm btn-secondary" onclick="Users.showEditModal(${user.id})">✏️ Editar</button>
                ${!isCurrentUser ? `<button class="btn btn-sm btn-danger" onclick="Users.confirmDelete(${user.id})">🗑️ Eliminar</button>` : ''}
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');
    }, 0);

    return html;
  },

  // Render permission checkboxes
  renderPermissionGroups(selectedPermissions = []) {
    let html = '<div class="permission-groups">';

    Object.keys(PERMISSION_GROUPS).forEach(groupKey => {
      const group = PERMISSION_GROUPS[groupKey];
      html += `
        <div class="permission-group">
          <h4 class="permission-group-title">${group.icon} ${group.label}</h4>
          <div class="permission-list">
      `;

      group.permissions.forEach(perm => {
        const isChecked = selectedPermissions.includes(perm.key);
        html += `
          <label class="permission-item">
            <input type="checkbox" name="permissions" value="${perm.key}" ${isChecked ? 'checked' : ''}>
            <div class="permission-info">
              <div class="permission-label">${perm.label}</div>
              <div class="permission-description">${perm.description}</div>
            </div>
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';

    // Add quick select buttons
    html += `
      <div class="permission-quick-actions">
        <button type="button" class="btn btn-sm btn-secondary" onclick="Users.selectAllPermissions()">✓ Seleccionar Todos</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="Users.selectNonePermissions()">✗ Deseleccionar Todos</button>
        <button type="button" class="btn btn-sm btn-info" onclick="Users.selectAdminPermissions()">👑 Permisos de Admin</button>
        <button type="button" class="btn btn-sm btn-success" onclick="Users.selectViewerPermissions()">👁️ Solo Lectura</button>
      </div>
    `;

    return html;
  },

  // Show create modal
  showCreateModal() {
    const modal = `
      <div class="modal-overlay" id="userModal">
        <div class="modal modal-large">
          <div class="modal-header">
            <h3 class="modal-title">Crear Nuevo Usuario</h3>
            <button class="modal-close" onclick="App.closeModal('userModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="userForm" onsubmit="Users.handleSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nombre de Usuario *</label>
                  <input type="text" class="form-input" name="username" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Nombre Completo *</label>
                  <input type="text" class="form-input" name="name" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Contraseña *</label>
                <input type="password" class="form-input" name="password" required minlength="6">
              </div>
              <div class="form-group">
                <label class="form-label">Permisos del Usuario</label>
                ${this.renderPermissionGroups([])}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('userModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('userForm').requestSubmit()">Crear Usuario</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Show edit modal
  async showEditModal(userId) {
    const users = await this.getAll();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modal = `
      <div class="modal-overlay" id="userModal">
        <div class="modal modal-large">
          <div class="modal-header">
            <h3 class="modal-title">Editar Usuario</h3>
            <button class="modal-close" onclick="App.closeModal('userModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="userForm" onsubmit="Users.handleSubmit(event, ${userId})">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nombre de Usuario *</label>
                  <input type="text" class="form-input" name="username" value="${user.username}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Nombre Completo *</label>
                  <input type="text" class="form-input" name="name" value="${user.name}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Nueva Contraseña (dejar en blanco para no cambiar)</label>
                <input type="password" class="form-input" name="password" minlength="6">
              </div>
              <div class="form-group">
                <label class="form-label">Permisos del Usuario</label>
                ${this.renderPermissionGroups(user.permissions || [])}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('userModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('userForm').requestSubmit()">Guardar Cambios</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Handle form submit
  async handleSubmit(event, userId = null) {
    event.preventDefault();
    const formData = new FormData(event.target);

    // Get selected permissions
    const permissions = Array.from(formData.getAll('permissions'));

    if (permissions.length === 0) {
      App.showAlert('warning', 'Debes seleccionar al menos un permiso');
      return;
    }

    const data = {
      username: formData.get('username'),
      name: formData.get('name'),
      permissions: permissions
    };

    const password = formData.get('password');
    if (password) {
      data.password = password;
    }

    let result;
    if (userId) {
      result = await this.update(userId, data);
    } else {
      if (!password) {
        App.showAlert('danger', 'La contraseña es requerida');
        return;
      }
      result = await this.create(data);
    }

    if (result.success) {
      App.closeModal('userModal');
      App.showAlert('success', userId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      App.navigate('users');
    } else {
      App.showAlert('danger', result.message);
    }
  },

  // Confirm delete
  async confirmDelete(userId) {
    const users = await this.getAll();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`¿Estás seguro de eliminar al usuario "${user.name}"?`)) {
      const result = await this.delete(userId);
      if (result.success) {
        App.showAlert('success', 'Usuario eliminado correctamente');
        App.navigate('users');
      } else {
        App.showAlert('danger', result.message);
      }
    }
  },

  // Quick permission selection helpers
  selectAllPermissions() {
    document.querySelectorAll('input[name="permissions"]').forEach(cb => cb.checked = true);
  },

  selectNonePermissions() {
    document.querySelectorAll('input[name="permissions"]').forEach(cb => cb.checked = false);
  },

  selectAdminPermissions() {
    this.selectNonePermissions();
    ADMIN_PERMISSIONS.forEach(perm => {
      const checkbox = document.querySelector(`input[name="permissions"][value="${perm}"]`);
      if (checkbox) checkbox.checked = true;
    });
  },

  selectViewerPermissions() {
    this.selectNonePermissions();
    VIEWER_PERMISSIONS.forEach(perm => {
      const checkbox = document.querySelector(`input[name="permissions"][value="${perm}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
};

// Search functionality
document.addEventListener('input', (e) => {
  if (e.target.id === 'userSearch') {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }
});
