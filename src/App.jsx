import { useEffect, useMemo, useState } from 'react'
import { api, API_BASE_URL } from './api'

function GraphCanvas({ nodes, edges, selectedId, onSelect }) {
  const { positionedNodes, edgeLines } = useMemo(() => {
    const centerX = 330
    const centerY = 230
    const radius = 165

    const positioned = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1)
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    })

    const byId = Object.fromEntries(positioned.map((n) => [n.id, n]))
    const lines = edges
      .map((edge) => {
        const source = byId[edge.source]
        const target = byId[edge.target]
        if (!source || !target) return null
        return { ...edge, x1: source.x, y1: source.y, x2: target.x, y2: target.y }
      })
      .filter(Boolean)

    return { positionedNodes: positioned, edgeLines: lines }
  }, [nodes, edges])

  return (
    <svg viewBox="0 0 660 460" className="graph-svg" role="img" aria-label="Product opportunity graph">
      <rect x="1" y="1" width="658" height="458" rx="12" className="graph-bg" />
      {edgeLines.map((line, idx) => (
        <line key={`${line.source}-${line.target}-${idx}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="edge" />
      ))}

      {positionedNodes.map((node) => (
        <g key={node.id} onClick={() => onSelect(node.id)} className="node-group" role="button">
          <circle
            cx={node.x}
            cy={node.y}
            r={selectedId === node.id ? 26 : 22}
            className={selectedId === node.id ? 'node selected' : 'node'}
          />
          <text x={node.x} y={node.y + 5} textAnchor="middle" className="node-score">
            {node.score}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [ideas, setIdeas] = useState([])
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [marketQuery, setMarketQuery] = useState('')
  const [marketResults, setMarketResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError('')
        const [graphData, ideasData] = await Promise.all([api.getGraph(12), api.getIdeas('', 25)])
        if (!active) return

        setGraph(graphData)
        setIdeas(ideasData)

        if (graphData.nodes.length) {
          const firstId = graphData.nodes[0].id
          const detail = await api.getIdeaById(firstId)
          if (!active) return
          setSelectedIdea(detail)
        }
      } catch (err) {
        if (!active) return
        setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  async function selectIdea(ideaId) {
    try {
      setError('')
      const detail = await api.getIdeaById(ideaId)
      setSelectedIdea(detail)
    } catch (err) {
      setError(err.message)
    }
  }

  async function runMarketSearch(event) {
    event.preventDefault()
    if (!marketQuery.trim()) return

    try {
      setError('')
      const result = await api.searchMarket(marketQuery.trim(), 10)
      setMarketResults(result.ideas || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredIdeas = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return ideas
    return ideas.filter((idea) => `${idea.title} ${idea.category} ${idea.problem}`.toLowerCase().includes(q))
  }, [ideas, searchTerm])

  return (
    <div className="page">
      <header className="topbar">
        <h1>Digital Product Miner Dashboard</h1>
        <p>API: {API_BASE_URL}</p>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <main className="layout">
        <section className="graph-panel card">
          <div className="panel-head">
            <h2>Most Promising Product Ideas</h2>
            <input
              placeholder="Filter ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading">Loading dashboard...</div>
          ) : (
            <div className="graph-content">
              <GraphCanvas
                nodes={graph.nodes.filter((n) => filteredIdeas.some((f) => f.id === n.id))}
                edges={graph.edges}
                selectedId={selectedIdea?.id}
                onSelect={selectIdea}
              />
              <div className="idea-list">
                {filteredIdeas.map((idea) => (
                  <button
                    key={idea.id}
                    className={selectedIdea?.id === idea.id ? 'idea-item active' : 'idea-item'}
                    onClick={() => selectIdea(idea.id)}
                  >
                    <strong>{idea.title}</strong>
                    <span>{idea.category}</span>
                    <span>Opportunity: {idea.opportunity_score}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="metrics-panel card">
          <h2>Idea Metrics (Lower Panel)</h2>
          {!selectedIdea ? (
            <div className="empty">Select an idea to view platform sales metrics.</div>
          ) : (
            <>
              <div className="idea-meta">
                <h3>{selectedIdea.title}</h3>
                <p>{selectedIdea.problem}</p>
                <p>
                  <strong>Gap:</strong> {selectedIdea.gap}
                </p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Listings</th>
                    <th>Sales / Week</th>
                    <th>Avg Price (USD)</th>
                    <th>Est. Monthly Revenue (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIdea.platforms.map((platform) => (
                    <tr key={platform.name}>
                      <td>{platform.name}</td>
                      <td>{platform.listing_count}</td>
                      <td>{platform.sales_frequency_per_week}</td>
                      <td>{platform.avg_price_usd}</td>
                      <td>{platform.est_monthly_revenue_usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section className="market-panel card">
          <h2>RAG / Research Search</h2>
          <form onSubmit={runMarketSearch} className="market-form">
            <input
              placeholder="Find products with market gaps..."
              value={marketQuery}
              onChange={(e) => setMarketQuery(e.target.value)}
            />
            <button type="submit">Run Search</button>
          </form>

          <div className="market-results">
            {marketResults.map((idea) => (
              <article key={idea.id} className="market-card">
                <h4>{idea.title}</h4>
                <p>{idea.gap}</p>
                <small>
                  Demand {idea.demand_score} • Competition {idea.competition_score} • Opportunity {idea.opportunity_score}
                </small>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
