/**
 * Small fetch-based API client. Mirrors what an axios instance did in the
 * React version: attaches the JWT automatically, throws on non-2xx so
 * callers can use try/catch, and returns parsed JSON.
 */
const api = {
  async _request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // No JSON body (e.g. 204) — that's fine.
    }

    if (!res.ok) {
      if (res.status === 401) {
        auth.logout();
      }
      const message = (data && data.message) || `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data;
  },

  get(path) {
    return this._request('GET', path);
  },
  post(path, body) {
    return this._request('POST', path, body);
  },
  put(path, body) {
    return this._request('PUT', path, body);
  },
  delete(path) {
    return this._request('DELETE', path);
  },
};
