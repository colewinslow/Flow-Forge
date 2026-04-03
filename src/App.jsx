import { useState, useRef, useEffect } from 'react'

const EXAMPLES = [
  "When a new lead comes in from Zillow, text them in 30 seconds, qualify them, and book a showing",
  "Customer submits a support ticket, categorize it, assign to the right team, send confirmation email",
  "New blog post published, generate social media snippets, schedule across platforms, track engagement",
  "Employee submits PTO request, check balance, notify manager, update calendar if approved",
]

export default function App() {
  const [input, setInput] = useState('')
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasForged, setHasForged] = useState(false)
  const canvasRef = useRef(null)

  const handleForge = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError('')
    setNodes([])
    setHasForged(true)

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input.trim() })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to parse workflow')
      }

      const data = await res.json()

      if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
        throw new Error('No workflow nodes returned')
      }

      setNodes(data.nodes)

      // Scroll to canvas after render
      setTimeout(() => {
        canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleForge()
    }
  }

  const handleExample = (text) => {
    setInput(text)
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <h1>FlowForge</h1>
        <p>
          Describe any business process in plain English — watch it become a visual workflow.
        </p>
      </header>

      {/* INPUT */}
      <section className="input-section">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a workflow... e.g. 'When a new lead comes in, qualify them, send a text, and book a showing'"
            rows={4}
          />
          <div className="input-actions">
            <span className="char-count">{input.length}/500</span>
            <button
              className="forge-btn"
              onClick={handleForge}
              disabled={!input.trim() || loading}
            >
              {loading ? 'Forging...' : 'Forge Flow'}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="examples">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => handleExample(ex)}
            >
              {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
            </button>
          ))}
        </div>
      </section>

      {/* FLOW OUTPUT */}
      <section ref={canvasRef}>
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span className="loading-text">Parsing workflow into steps...</span>
          </div>
        )}

        {error && (
          <div className="error-msg">{error}</div>
        )}

        {nodes.length > 0 && !loading && (
          <div className="flow-canvas">
            <div className="flow-track">
              {nodes.map((node, i) => (
                <div
                  key={node.id}
                  className="node-group"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <NodeCard node={node} index={i} />
                  {i < nodes.length - 1 && <Connector />}
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasForged && !loading && (
          <EmptyState />
        )}
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          Built by <a href="https://colewinslow.com" target="_blank" rel="noopener">Cole Winslow</a> · Powered by Claude API
        </p>
      </footer>
    </div>
  )
}

function NodeCard({ node, index }) {
  return (
    <div className="node-card" data-type={node.type}>
      <span className="node-icon">{node.icon}</span>
      <span className="node-type">{node.type}</span>
      <div className="node-label">{node.label}</div>
      <div className="node-desc">{node.description}</div>
    </div>
  )
}

function Connector() {
  return (
    <div className="connector">
      <div className="connector-line" />
      <div className="connector-arrow" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect x="4" y="22" width="12" height="12" rx="3" stroke="#C8C5BD" strokeWidth="1.5" />
        <rect x="22" y="22" width="12" height="12" rx="3" stroke="#C8C5BD" strokeWidth="1.5" />
        <rect x="40" y="22" width="12" height="12" rx="3" stroke="#C8C5BD" strokeWidth="1.5" />
        <line x1="16" y1="28" x2="22" y2="28" stroke="#C8C5BD" strokeWidth="1.5" />
        <line x1="34" y1="28" x2="40" y2="28" stroke="#C8C5BD" strokeWidth="1.5" />
      </svg>
      <p>Describe a workflow above to see it visualized</p>
    </div>
  )
}
