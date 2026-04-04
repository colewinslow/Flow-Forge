import { useState } from 'react'
import PromptPage from './components/PromptPage'
import WorkflowCanvas from './components/WorkflowCanvas'

function LoadingState() {
  return (
    <div className="loading-page">
      <div className="loading-assembly">
        <div className="loading-dot" />
        <div className="loading-connector" />
        <div className="loading-dot" />
        <div className="loading-connector" />
        <div className="loading-dot" />
        <div className="loading-connector" />
        <div className="loading-dot" />
      </div>
      <p className="loading-label">Generating workflows for n8n, Zapier, and Make...</p>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('prompt')
  const [workflows, setWorkflows] = useState(null)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')

  const handleForge = async (description, apiKey) => {
    setPage('loading')
    setError('')
    setPrompt(description)

    try {
      const body = { description }
      if (apiKey) body.apiKey = apiKey

      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to parse workflow')
      }

      const data = await res.json()

      if (!data.workflows?.n8n || !data.workflows?.zapier || !data.workflows?.make) {
        throw new Error('Incomplete workflow data returned')
      }

      setWorkflows(data.workflows)
      setPage('canvas')
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      setPage('prompt')
    }
  }

  const handleBack = () => {
    setPage('prompt')
    setWorkflows(null)
    setError('')
  }

  if (page === 'loading') return <LoadingState />
  if (page === 'canvas' && workflows) {
    return (
      <WorkflowCanvas
        workflows={workflows}
        prompt={prompt}
        onBack={handleBack}
      />
    )
  }
  return <PromptPage onForge={handleForge} error={error} />
}
