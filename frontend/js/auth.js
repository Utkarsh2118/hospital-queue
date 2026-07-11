const auth = {
  getUser() {
    const stored = localStorage.getItem('mq_user');
    return stored ? JSON.parse(stored) : null;
  },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('mq_token', data.token);
    localStorage.setItem('mq_user', JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    localStorage.removeItem('mq_token');
    localStorage.removeItem('mq_user');
  },

  /**
   * Call at the top of a protected page. Redirects to login.html if not
   * signed in, or if signed in with the wrong role.
   */
  requireRole(role) {
    const user = this.getUser();
    if (!user || (role && user.role !== role)) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },
};
