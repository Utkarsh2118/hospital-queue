const auth = {
  /** Reads from whichever storage actually has a session — remember-me
   *  puts it in localStorage, "don't remember" puts it in sessionStorage. */
  getToken() {
    return localStorage.getItem('mq_token') || sessionStorage.getItem('mq_token');
  },

  getUser() {
    const stored = localStorage.getItem('mq_user') || sessionStorage.getItem('mq_user');
    return stored ? JSON.parse(stored) : null;
  },

  async login(email, password, rememberMe = true) {
    const data = await api.post('/auth/login', { email, password });
    const store = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    // Clear the other storage first so a stale session can't linger there.
    other.removeItem('mq_token');
    other.removeItem('mq_user');
    store.setItem('mq_token', data.token);
    store.setItem('mq_user', JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    localStorage.removeItem('mq_token');
    localStorage.removeItem('mq_user');
    sessionStorage.removeItem('mq_token');
    sessionStorage.removeItem('mq_user');
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
