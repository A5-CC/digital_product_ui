const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sutdy7lh5e.execute-api.us-east-2.amazonaws.com'
let authToken = localStorage.getItem('dpm_access_token') || ''

function buildAuthHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

function setAuthToken(token) {
  authToken = token || ''
  if (authToken) {
    localStorage.setItem('dpm_access_token', authToken)
  } else {
    localStorage.removeItem('dpm_access_token')
  }
}

function getAuthToken() {
  return authToken
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
      ...(options.headers || {})
    },
    ...options
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text || 'Request failed'}`)
  }

  return res.json()
}

export const api = {
  login: async (password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
    setAuthToken(data.access_token)
    return data
  },
  getGraph: (limit = 12) => request(`/api/v1/dashboard/graph?limit=${limit}`),
  getIdeas: (query = '', limit = 25) =>
    request(`/api/v1/ideas?query=${encodeURIComponent(query)}&limit=${limit}`),
  getIdeaById: (ideaId) => request(`/api/v1/ideas/${ideaId}`),
  searchMarket: (query, maxResults = 10) =>
    request('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify({ query, max_results: maxResults })
    }),
  logout: () => setAuthToken(''),
  getToken: () => getAuthToken()
}

export { API_BASE_URL }
