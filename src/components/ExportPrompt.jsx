import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'

const PLATFORM_LABELS = {
  n8n: 'n8n',
  zapier: 'Zapier',
  make: 'Make',
}

function buildPrompt(nodes, platform, userPrompt) {
  const steps = nodes.map((n, i) => {
    const name = n.name || n.label
    const plat = n.platform_label || n.type.replace(/_/g, ' ')
    let line = `${i + 1}. [${plat}] ${name} — ${n.description}`
    if (n.branch) {
      if (n.branch.true) line += `\n   → If YES: go to step that handles the true path`
      if (n.branch.false) line += `\n   → If NO: go to step that handles the false path`
    }
    return line
  }).join('\n')

  if (platform === 'n8n') {
    return `Build me a complete n8n workflow as importable JSON. The workflow should do the following:

"${userPrompt}"

Here are the exact steps broken down:

${steps}

Requirements:
- Return valid n8n workflow JSON that I can import directly via n8n's "Import from JSON" feature
- Use the correct n8n node types (e.g., n8n-nodes-base.webhook, n8n-nodes-base.httpRequest, n8n-nodes-base.if, etc.)
- Wire all connections between nodes correctly in the "connections" object
- Include reasonable default parameters for each node
- Position nodes on the canvas so they don't overlap (use the "position" field)
- Add any necessary credentials placeholders
- Return ONLY the JSON, no explanation`
  }

  if (platform === 'zapier') {
    return `Help me build a Zapier automation (Zap) for the following process:

"${userPrompt}"

Here's the step-by-step breakdown:

${steps}

For each step, tell me:
1. Which Zapier app/integration to use
2. The specific trigger or action to select
3. How to configure the key fields
4. How to map data between steps (what fields to reference from previous steps)

If this requires multiple Zaps (Zapier doesn't support complex branching in a single Zap), explain how to split it and connect them.`
  }

  // make
  return `Build me a Make (formerly Integromat) scenario for the following process:

"${userPrompt}"

Here's the step-by-step breakdown:

${steps}

For each module, tell me:
1. The exact Make module to use (app + action)
2. Key configuration fields and their values
3. How to map data from previous modules using Make's data mapping syntax
4. Where to add Routers for branching and what filter conditions to set

If possible, provide the scenario blueprint JSON I can import into Make.`
}

export default function ExportPrompt({ nodes, platform, prompt, onClose }) {
  const [copied, setCopied] = useState(false)
  const text = buildPrompt(nodes, platform, prompt)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="export-overlay" onClick={onClose}>
      <div className="export-modal" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <div>
            <h3>Claude Code Prompt</h3>
            <p>Copy this into Claude to build the actual {PLATFORM_LABELS[platform] || platform} workflow</p>
          </div>
          <button className="export-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <pre className="export-body">{text}</pre>
        <div className="export-footer">
          <button className="export-copy" onClick={handleCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  )
}
