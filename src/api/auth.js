const TOKEN_KEY = 'admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function authRequest(url, options = {}) {
  const token = getToken()
  const res = await fetch(`/api${url}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export function login(password) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setToken(data.token)
      return data
    })
}

export function logout() {
  const token = getToken()
  if (token) {
    return authRequest('/auth/logout', { method: 'POST' }).finally(clearToken)
  }
  clearToken()
  return Promise.resolve()
}

export function checkAuth() {
  if (!getToken()) return Promise.reject(new Error('Not authenticated'))
  return authRequest('/auth/check')
}
