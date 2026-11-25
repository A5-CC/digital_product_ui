const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://3.135.194.92:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
  getGraph: (limit = 12) => request(`/api/v1/dashboard/graph?limit=${limit}`),
  getIdeas: (query = '', limit = 25) =>
    request(`/api/v1/ideas?query=${encodeURIComponent(query)}&limit=${limit}`),
  getIdeaById: (ideaId) => request(`/api/v1/ideas/${ideaId}`),
  searchMarket: (query, maxResults = 10) =>
    request('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify({ query, max_results: maxResults })
    })
}

export { API_BASE_URL }
