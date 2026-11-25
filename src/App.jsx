import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

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
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [marketResults, setMarketResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
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

        const broadQuery = 'top-selling digital product opportunities with market gaps'
        const broadSearch = await api.searchMarket(broadQuery, 8)
        if (!active) return

        const initialIdeas = broadSearch.ideas || []
        setMarketResults(initialIdeas)
        setChatHistory([
          {
            role: 'assistant',
            text: 'Initial broad search loaded. Ask for a niche and I will refine opportunities over time.'
          },
          {
            role: 'assistant',
            text:
              initialIdeas.length > 0
                ? `Top themes found: ${initialIdeas.map((idea) => idea.title).join(', ')}`
                : 'No broad opportunities found yet. Try a niche prompt.'
          }
        ])
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
    const query = chatInput.trim()
    if (!query) return

    setChatHistory((prev) => [...prev, { role: 'user', text: query }])
    setChatInput('')

    try {
      setChatLoading(true)
      setError('')
      const result = await api.searchMarket(query, 10)
      const refinedIdeas = result.ideas || []
      setMarketResults(refinedIdeas)
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            refinedIdeas.length > 0
              ? `Refined results: ${refinedIdeas.map((idea) => idea.title).join(', ')}`
              : 'No matching ideas for that niche yet. Try another prompt.'
        }
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Digital Product Miner Dashboard</h1>
          <p className="subtitle">Opportunity discovery workspace for digital product niches</p>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <main className="dashboard-grid">
        <div className="left-column">
          <section className="graph-panel card">
            <div className="panel-head">
              <h2>Potential Products</h2>
              <span className="pill">{ideas.length} ideas</span>
            </div>

            {loading ? (
              <div className="loading">Loading dashboard...</div>
            ) : (
              <div className="graph-content">
                <GraphCanvas
                  nodes={graph.nodes}
                  edges={graph.edges}
                  selectedId={selectedIdea?.id}
                  onSelect={selectIdea}
                />
                <div className="idea-list">
                  {ideas.map((idea) => (
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
            <p className="panel-kicker">Idea Metrics (Lower Panel)</p>
            <h2>Product Metrics</h2>
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
        </div>

        <section className="chat-panel card">
          <div className="panel-head">
            <h2>Niche Research Chat</h2>
            <span className="pill pill-accent">Live</span>
          </div>
          <p className="chat-caption">Refine niches over time. Broad market results are listed below.</p>
          <div className="chat-history">
            {chatHistory.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={msg.role === 'user' ? 'chat-bubble user' : 'chat-bubble assistant'}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={runMarketSearch} className="chat-form">
            <input
              placeholder="Ask for a product niche..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" disabled={chatLoading}>
              {chatLoading ? 'Thinking...' : 'Send'}
            </button>
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
