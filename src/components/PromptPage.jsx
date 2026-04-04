import { useState, useEffect } from 'react'
import { Key, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'

const EXAMPLES = [
  "When a new lead comes in from Zillow, text them in 30 seconds, qualify them, and book a showing",
  "Customer submits a support ticket, categorize it, assign to the right team, send confirmation email",
  "New blog post published, generate social media snippets, schedule across platforms, track engagement",
  "Employee submits PTO request, check balance, notify manager, update calendar if approved",
]

const STORAGE_KEY = 'flowforge_api_key'

export default function PromptPage({ onForge, error }) {
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [showKey, setShowKey] = useState(false)
  const [keyOpen, setKeyOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [apiKey])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (input.trim()) onForge(input.trim(), apiKey || null)
    }
  }

  const hasKey = apiKey.startsWith('sk-ant-')

  return (
    <div className="app-container">
      <header className="header">
        <h1>FlowForge</h1>
        <p>Describe any business process in plain English — see how to automate it across platforms.</p>
      </header>

      <section className="input-section">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a task you want to automate... e.g. 'When a new lead comes in, qualify them, send a text, and book a showing'"
            rows={4}
          />
          <div className="input-actions">
            <span className="char-count">{input.length}/500</span>
            <button
              className="forge-btn"
              onClick={() => input.trim() && onForge(input.trim(), apiKey || null)}
              disabled={!input.trim()}
            >
              Forge Flow
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="15" height="15">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>

        {/* API Key Section */}
        <div className="api-key-section">
          <button className="api-key-toggle" onClick={() => setKeyOpen(!keyOpen)}>
            <Key size={14} />
            <span>API Key</span>
            {hasKey && <span className="api-key-status">Connected</span>}
            {keyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {keyOpen && (
            <div className="api-key-body">
              <div className="api-key-input-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="api-key-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  className="api-key-eye"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="api-key-hint">
                Your key is stored in your browser only and sent directly to the Anthropic API.
                Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>
              </p>
            </div>
          )}
        </div>

        <div className="examples">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => setInput(ex)}
            >
              {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
            </button>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}
      </section>

      <footer className="footer">
        <p>
          Built by <a href="https://colewinslow.com" target="_blank" rel="noopener">Cole Winslow</a> · Powered by Claude API
        </p>
      </footer>
    </div>
  )
}
