const user = auth.requireRole('admin');

if (user) {
  const messageBox = document.getElementById('messageBox');
  const deptForm = document.getElementById('deptForm');
  const doctorForm = document.getElementById('doctorForm');
  const deptList = document.getElementById('deptList');
  const doctorList = document.getElementById('doctorList');
  const doctorDeptSelect = document.getElementById('doctorDeptSelect');

  const editDeptModalOverlay = document.getElementById('editDeptModalOverlay');
  const editDeptForm = document.getElementById('editDeptForm');
  const editDeptCancelBtn = document.getElementById('editDeptCancelBtn');

  const deleteDeptModalOverlay = document.getElementById('deleteDeptModalOverlay');
  const deleteDeptMessage = document.getElementById('deleteDeptMessage');
  const deleteDeptCancelBtn = document.getElementById('deleteDeptCancelBtn');
  const deleteDeptConfirmBtn = document.getElementById('deleteDeptConfirmBtn');

  const resetPasswordModalOverlay = document.getElementById('resetPasswordModalOverlay');
  const resetPasswordMessage = document.getElementById('resetPasswordMessage');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const resetPasswordCancelBtn = document.getElementById('resetPasswordCancelBtn');

  let editingDeptId = null;
  let deletingDeptId = null;
  let resettingUserId = null;

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = `admin__message admin__message--${type}`;
    messageBox.classList.remove('hidden');
  }

  function closeAllModals() {
    editDeptModalOverlay.classList.add('hidden');
    deleteDeptModalOverlay.classList.add('hidden');
    resetPasswordModalOverlay.classList.add('hidden');
  }

  // ===== Departments =====
  async function loadDepartments() {
    const departments = await api.get('/departments');

    if (departments.length === 0) {
      deptList.innerHTML = `
        <div class="empty-state">
          <span class="icon-circle empty-state__icon">${iconSvg('inbox')}</span>
          <p class="empty-state__text">No departments yet. Add one above to get started.</p>
        </div>
      `;
    } else {
      deptList.innerHTML = '';
      departments.forEach((d) => {
        const row = document.createElement('div');
        row.className = 'admin__list-row admin__list-row--dept';
        row.innerHTML = `
          <span class="admin__list-prefix">${d.tokenPrefix}</span>
          <span>
            ${d.name}
            ${d.roomNumber ? `<span class="admin__list-room">${d.roomNumber}</span>` : ''}
          </span>
          <span class="admin__row-actions">
            <button class="admin__icon-btn" data-action="edit-dept" title="Edit">${iconSvg('pencil')}</button>
            <button class="admin__icon-btn admin__icon-btn--danger" data-action="delete-dept" title="Remove">${iconSvg('trash')}</button>
          </span>
        `;
        row.querySelector('[data-action="edit-dept"]').addEventListener('click', () => openEditDeptModal(d));
        row.querySelector('[data-action="delete-dept"]').addEventListener('click', () => openDeleteDeptModal(d));
        deptList.appendChild(row);
      });
    }

    doctorDeptSelect.innerHTML = '<option value="">Select department</option>';
    departments.forEach((d) => {
      const option = document.createElement('option');
      option.value = d._id;
      option.textContent = d.name;
      doctorDeptSelect.appendChild(option);
    });
  }

  deptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('deptNameInput').value.trim();
    const code = document.getElementById('deptCodeInput').value.trim().toUpperCase();
    const tokenPrefix = document.getElementById('deptPrefixInput').value.trim().toUpperCase();
    const roomNumber = document.getElementById('deptRoomInput').value.trim();

    try {
      await api.post('/departments', { name, code, tokenPrefix, roomNumber });
      showMessage(`Department "${name}" created.`, 'ok');
      showToast(`Department "${name}" created.`, 'success');
      deptForm.reset();
      await loadDepartments();
    } catch (err) {
      showMessage(err.message || 'Could not create department.', 'error');
      showToast(err.message || 'Could not create department.', 'error');
    }
  });

  function openEditDeptModal(dept) {
    editingDeptId = dept._id;
    document.getElementById('editDeptNameInput').value = dept.name;
    document.getElementById('editDeptCodeInput').value = dept.code;
    document.getElementById('editDeptPrefixInput').value = dept.tokenPrefix;
    document.getElementById('editDeptRoomInput').value = dept.roomNumber || '';
    editDeptModalOverlay.classList.remove('hidden');
  }

  editDeptCancelBtn.addEventListener('click', () => {
    editDeptModalOverlay.classList.add('hidden');
    editingDeptId = null;
  });

  editDeptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingDeptId) return;
    const name = document.getElementById('editDeptNameInput').value.trim();
    const code = document.getElementById('editDeptCodeInput').value.trim().toUpperCase();
    const tokenPrefix = document.getElementById('editDeptPrefixInput').value.trim().toUpperCase();
    const roomNumber = document.getElementById('editDeptRoomInput').value.trim();

    try {
      await api.put(`/departments/${editingDeptId}`, { name, code, tokenPrefix, roomNumber });
      showToast(`Department "${name}" updated.`, 'success');
      closeAllModals();
      editingDeptId = null;
      await loadDepartments();
    } catch (err) {
      showToast(err.message || 'Could not update department.', 'error');
    }
  });

  function openDeleteDeptModal(dept) {
    deletingDeptId = dept._id;
    deleteDeptMessage.textContent = `"${dept.name}" will be hidden from the kiosk and display screen. Existing tokens are kept for today's records.`;
    deleteDeptModalOverlay.classList.remove('hidden');
  }

  deleteDeptCancelBtn.addEventListener('click', () => {
    deleteDeptModalOverlay.classList.add('hidden');
    deletingDeptId = null;
  });

  deleteDeptConfirmBtn.addEventListener('click', async () => {
    if (!deletingDeptId) return;
    try {
      await api.delete(`/departments/${deletingDeptId}`);
      showToast('Department removed.', 'success');
      await loadDepartments();
    } catch (err) {
      showToast(err.message || 'Could not remove department.', 'error');
    } finally {
      deleteDeptModalOverlay.classList.add('hidden');
      deletingDeptId = null;
    }
  });

  // ===== Doctors =====
  doctorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('doctorNameInput').value.trim();
    const email = document.getElementById('doctorEmailInput').value.trim();
    const password = document.getElementById('doctorPasswordInput').value;
    const department = doctorDeptSelect.value;

    try {
      await api.post('/users', { name, email, password, department, role: 'doctor' });
      showMessage(`Doctor account for "${name}" created.`, 'ok');
      showToast(`Doctor account for "${name}" created.`, 'success');
      doctorForm.reset();
      await loadDoctors();
    } catch (err) {
      showMessage(err.message || 'Could not create doctor account.', 'error');
      showToast(err.message || 'Could not create doctor account.', 'error');
    }
  });

  async function loadDoctors() {
    try {
      const users = await api.get('/users');
      const doctors = users.filter((u) => u.role === 'doctor');

      if (doctors.length === 0) {
        doctorList.innerHTML = `
          <div class="empty-state">
            <span class="icon-circle empty-state__icon">${iconSvg('inbox')}</span>
            <p class="empty-state__text">No doctor accounts yet. Create one above.</p>
          </div>
        `;
        return;
      }

      doctorList.innerHTML = '';
      doctors.forEach((d) => {
        const row = document.createElement('div');
        row.className = 'admin__list-row admin__list-row--doctor';
        row.innerHTML = `
          <span class="admin__status-dot ${d.isActive ? 'admin__status-dot--active' : 'admin__status-dot--inactive'}"></span>
          <span>
            <strong>${d.name}</strong>
            <span class="admin__list-room">${d.email}${d.department ? ` · ${d.department.name}` : ''}</span>
          </span>
          <span class="admin__row-actions">
            <button class="admin__icon-btn" data-action="reset-pw" title="Reset password">${iconSvg('key')}</button>
            <button class="admin__text-btn ${d.isActive ? 'admin__text-btn--danger' : ''}" data-action="toggle-active">
              ${d.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </span>
        `;
        row.querySelector('[data-action="reset-pw"]').addEventListener('click', () => openResetPasswordModal(d));
        row.querySelector('[data-action="toggle-active"]').addEventListener('click', () => toggleDoctorActive(d));
        doctorList.appendChild(row);
      });
    } catch (err) {
      showToast(err.message || 'Could not load doctor accounts.', 'error');
    }
  }

  async function toggleDoctorActive(doctorUser) {
    try {
      await api.put(`/users/${doctorUser._id || doctorUser.id}`, { isActive: !doctorUser.isActive });
      showToast(`${doctorUser.name} ${doctorUser.isActive ? 'deactivated' : 'activated'}.`, 'success');
      await loadDoctors();
    } catch (err) {
      showToast(err.message || 'Could not update doctor status.', 'error');
    }
  }

  function openResetPasswordModal(doctorUser) {
    resettingUserId = doctorUser._id || doctorUser.id;
    resetPasswordMessage.textContent = `Set a new temporary password for ${doctorUser.name}. Share it with them directly — there's no email/SMS reset yet.`;
    newPasswordInput.value = '';
    resetPasswordModalOverlay.classList.remove('hidden');
    setTimeout(() => newPasswordInput.focus(), 50);
  }

  resetPasswordCancelBtn.addEventListener('click', () => {
    resetPasswordModalOverlay.classList.add('hidden');
    resettingUserId = null;
  });

  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!resettingUserId) return;
    const password = newPasswordInput.value;
    try {
      await api.put(`/users/${resettingUserId}/reset-password`, { password });
      showToast('Password reset.', 'success');
      closeAllModals();
      resettingUserId = null;
    } catch (err) {
      showToast(err.message || 'Could not reset password.', 'error');
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
    window.location.href = 'login.html';
  });

  loadDepartments();
  loadDoctors();
}
