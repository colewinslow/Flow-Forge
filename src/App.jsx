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
        <div className="header-badge">FlowForge</div>
        <h1>
          Describe it. <span>See the flow.</span>
        </h1>
        <p>
          Type any business process in plain English. AI breaks it into discrete
          automation nodes — visualized instantly.
        </p>
      </header>

      {/* INPUT */}
      <section className="input-section">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a workflow... e.g. 'When a new lead comes in from Zillow, text them in 30 seconds, qualify them, and book a showing'"
            rows={4}
          />
          <div className="input-actions">
            <span className="char-count">{input.length}/500</span>
            <button
              className="forge-btn"
              onClick={handleForge}
              disabled={!input.trim() || loading}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8h12M10 4l4 4-4 4" />
              </svg>
              {loading ? 'Forging...' : 'Forge Flow'}
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
              {ex.length > 50 ? ex.slice(0, 50) + '…' : ex}
            </button>
          ))}
        </div>
      </section>

      {/* FLOW OUTPUT */}
      <section ref={canvasRef}>
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span className="loading-text">Decomposing workflow into nodes…</span>
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
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <NodeCard node={node} index={i} />
                  {i < nodes.length - 1 && <Connector delay={i * 150 + 100} />}
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

function Connector({ delay }) {
  return (
    <div className="connector" style={{ animationDelay: `${delay}ms` }}>
      <div className="connector-line" />
      <div className="connector-dot" />
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 0',
      opacity: 0.5
    }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
        <rect x="4" y="24" width="16" height="16" rx="4" stroke="#555570" strokeWidth="1.5" />
        <rect x="24" y="24" width="16" height="16" rx="4" stroke="#555570" strokeWidth="1.5" />
        <rect x="44" y="24" width="16" height="16" rx="4" stroke="#555570" strokeWidth="1.5" />
        <line x1="20" y1="32" x2="24" y2="32" stroke="#555570" strokeWidth="1.5" />
        <line x1="40" y1="32" x2="44" y2="32" stroke="#555570" strokeWidth="1.5" />
      </svg>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        Describe a workflow above to see it visualized
      </p>
    </div>
  )
}
