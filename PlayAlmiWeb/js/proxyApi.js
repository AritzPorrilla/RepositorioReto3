(function initPlayAlmiProxy(globalScope) {
  const EXPLICIT_API_BASE = String(globalScope.PLAYALMI_API_BASE_URL || '').trim();
  const FALLBACK_API_BASE = 'http://20.203.222.95:8080';
  const LOCAL_API_BASE = 'http://127.0.0.1:8080';
  const DEFAULT_TIMEOUT_MS = 10000;
  let activeApiBase = '';

  function normalizeBase(baseUrl) {
    return String(baseUrl || '').trim().replace(/\/$/, '');
  }

  function getApiBaseCandidates() {
    const bases = [];

    if (EXPLICIT_API_BASE) {
      bases.push(normalizeBase(EXPLICIT_API_BASE));
    }

    if (activeApiBase) {
      bases.push(normalizeBase(activeApiBase));
    }

    try {
      const origin = String(globalScope.location?.origin || '').trim();
      if (/^https?:\/\//i.test(origin)) {
        bases.push(normalizeBase(origin));
      }
    } catch {
      // Ignore and continue with fallbacks.
    }

    bases.push(normalizeBase(LOCAL_API_BASE));
    bases.push(normalizeBase(FALLBACK_API_BASE));

    return [...new Set(bases.filter(Boolean))];
  }

  function resolveApiBase() {
    return getApiBaseCandidates()[0] || normalizeBase(FALLBACK_API_BASE);
  }

  function joinUrl(baseUrl, path) {
    return `${String(baseUrl || '').replace(/\/$/, '')}/${String(path || '').replace(/^\//, '')}`;
  }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiBases = getApiBaseCandidates();
    let lastError = null;

    try {
      for (const baseUrl of apiBases) {
        const url = joinUrl(baseUrl, path);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal
          });

          const raw = await response.text();
          let data = {};

          if (raw) {
            try {
              data = JSON.parse(raw);
            } catch {
              data = { message: raw };
            }
          }

          if (!response.ok) {
            const message = String(data?.message || data?.error || `Error HTTP ${response.status}`).trim();
            const error = new Error(message || `Error HTTP ${response.status}`);
            error.status = response.status;
            error.url = url;

            // 404/405 are commonly returned by the web host when /api is not mounted there.
            if (response.status === 404 || response.status === 405) {
              lastError = error;
              continue;
            }

            throw error;
          }

          activeApiBase = baseUrl;
          return { response, data, url };
        } catch (error) {
          if (String(error?.name || '') === 'AbortError') {
            const timeoutError = new Error(`Tiempo de espera agotado al conectar con ${url}`);
            timeoutError.status = 408;
            timeoutError.url = url;
            lastError = timeoutError;
            continue;
          }

          if (String(error?.name || '') === 'TypeError') {
            const networkError = new Error(`Fallo de red al conectar con ${url}`);
            networkError.status = 0;
            networkError.url = url;
            lastError = networkError;
            continue;
          }

          throw error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      throw new Error('No se pudo conectar con la API');
    } finally {
      clearTimeout(timer);
    }
  }

  const proxyApi = {
    getUsersUrl() {
      return joinUrl(resolveApiBase(), '/api/users');
    },

    getUserUrl(userId) {
      return joinUrl(resolveApiBase(), `/api/users/${encodeURIComponent(String(userId || '').trim())}`);
    },

    async getUsers(timeoutMs) {
      return request('/api/users', { method: 'GET', timeoutMs });
    },

    async createUser(payload, timeoutMs) {
      return request('/api/users', { method: 'POST', body: payload, timeoutMs });
    },

    async login(payload, timeoutMs) {
      return request('/api/login', { method: 'POST', body: payload, timeoutMs });
    },

    async updateUser(userId, payload, timeoutMs) {
      const id = String(userId || '').trim();
      return request(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: {
          authenticatedUserId: id,
          ...(payload || {})
        },
        timeoutMs
      });
    },

    async deleteUser(userId, timeoutMs) {
      const id = String(userId || '').trim();
      return request(`/api/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: {
          authenticatedUserId: id
        },
        timeoutMs
      });
    }
  };

  globalScope.PlayAlmiProxy = proxyApi;
})(window);
