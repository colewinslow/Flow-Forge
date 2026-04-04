import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import WorkflowNode, { NODE_W, NODE_H } from './WorkflowNode'
import ExportPrompt from './ExportPrompt'

const GAP_X = 100
const GAP_Y = 60
const PAD = 80

const PLATFORMS = [
  { id: 'n8n', label: 'n8n' },
  { id: 'zapier', label: 'Zapier' },
  { id: 'make', label: 'Make' },
]

/* ── graph helpers ── */

function ensureConnections(nodes) {
  const normalized = nodes.map((n, i) => ({
    ...n,
    id: String(n.id ?? `node_${i + 1}`),
    connects_to: (n.connects_to || []).map(String),
    branch: n.branch
      ? { true: n.branch.true ? String(n.branch.true) : null,
          false: n.branch.false ? String(n.branch.false) : null }
      : null,
  }))

  const hasConnections = normalized.some(
    n => n.connects_to.length > 0 || n.branch?.true || n.branch?.false,
  )

  if (!hasConnections) {
    return normalized.map((n, i) => ({
      ...n,
      connects_to: i < normalized.length - 1 ? [normalized[i + 1].id] : [],
    }))
  }
  return normalized
}

function getTargets(node) {
  const t = []
  if (node.branch?.true) t.push(node.branch.true)
  if (node.branch?.false) t.push(node.branch.false)
  if (node.connects_to) {
    node.connects_to.forEach(id => { if (!t.includes(id)) t.push(id) })
  }
  return t
}

function computeLayout(nodes) {
  if (!nodes.length) return new Map()

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  const targeted = new Set()
  nodes.forEach(n => getTargets(n).forEach(t => targeted.add(t)))
  const root = nodes.find(n => !targeted.has(n.id)) || nodes[0]

  const cols = new Map()
  cols.set(root.id, 0)
  let changed = true
  let safety = 0
  while (changed && safety++ < 50) {
    changed = false
    for (const node of nodes) {
      const col = cols.get(node.id)
      if (col === undefined) continue
      for (const t of getTargets(node)) {
        if ((cols.get(t) ?? -1) < col + 1) {
          cols.set(t, col + 1)
          changed = true
        }
      }
    }
  }
  nodes.forEach((n, i) => { if (!cols.has(n.id)) cols.set(n.id, i) })

  const rows = new Map()
  const visited = new Set()
  function assignRow(id, row) {
    if (visited.has(id)) return
    visited.add(id)
    rows.set(id, row)
    const node = nodeMap.get(id)
    if (!node) return
    if (node.branch?.true && node.branch?.false) {
      assignRow(node.branch.true, row - 1)
      assignRow(node.branch.false, row + 1)
    } else {
      getTargets(node).forEach(t => assignRow(t, row))
    }
  }
  assignRow(root.id, 0)
  nodes.forEach(n => { if (!rows.has(n.id)) rows.set(n.id, 0) })

  const minRow = Math.min(...rows.values())

  const positions = new Map()
  nodes.forEach(n => {
    positions.set(n.id, {
      x: PAD + (cols.get(n.id) || 0) * (NODE_W + GAP_X),
      y: PAD + ((rows.get(n.id) || 0) - minRow) * (NODE_H + GAP_Y),
    })
  })

  return positions
}

function getConnections(nodes) {
  const conns = []
  nodes.forEach(node => {
    if (node.branch?.true)
      conns.push({ from: node.id, to: node.branch.true, label: 'Yes', fromPort: 'true' })
    if (node.branch?.false)
      conns.push({ from: node.id, to: node.branch.false, label: 'No', fromPort: 'false' })
    if (node.connects_to) {
      node.connects_to.forEach(t => {
        if (t !== node.branch?.true && t !== node.branch?.false)
          conns.push({ from: node.id, to: t })
      })
    }
  })
  return conns
}

function buildPath(fromPos, toPos, fromPort) {
  let sy = fromPos.y + NODE_H / 2
  if (fromPort === 'true') sy = fromPos.y + NODE_H * 0.33
  if (fromPort === 'false') sy = fromPos.y + NODE_H * 0.67

  const sx = fromPos.x + NODE_W + 6
  const tx = toPos.x - 6
  const ty = toPos.y + NODE_H / 2
  const cp = Math.max(Math.abs(tx - sx) * 0.45, 50)

  return {
    d: `M ${sx} ${sy} C ${sx + cp} ${sy}, ${tx - cp} ${ty}, ${tx} ${ty}`,
    labelX: sx + 16,
    labelY: sy - 8,
  }
}

/* ── canvas component ── */

export default function WorkflowCanvas({ workflows, prompt, onBack }) {
  const [platform, setPlatform] = useState('n8n')
  const [showExport, setShowExport] = useState(false)

  // precompute all three layouts once
  const allData = useMemo(() => {
    const result = {}
    for (const pid of ['n8n', 'zapier', 'make']) {
      const raw = workflows[pid] || []
      const processed = ensureConnections(raw)
      result[pid] = {
        processed,
        layout: computeLayout(processed),
        connections: getConnections(processed),
      }
    }
    return result
  }, [workflows])

  const { processed, connections } = allData[platform]

  // positions are per-platform and mutable (for drag)
  const [dragOffsets, setDragOffsets] = useState({ n8n: new Map(), zapier: new Map(), make: new Map() })

  const positions = useMemo(() => {
    const base = allData[platform].layout
    const offsets = dragOffsets[platform]
    if (offsets.size === 0) return base
    const merged = new Map(base)
    offsets.forEach((offset, id) => {
      const orig = base.get(id)
      if (orig) merged.set(id, { x: orig.x + offset.dx, y: orig.y + offset.dy })
    })
    return merged
  }, [allData, platform, dragOffsets])

  // pan + zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  const canvasRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const draggingNode = useRef(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragNodeStart = useRef({ x: 0, y: 0 })

  /* zoom */
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    setZoom(z => Math.min(Math.max(z * delta, 0.25), 2.5))
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  /* pan */
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target !== canvasRef.current && !e.target.classList.contains('canvas-inner')) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
    e.preventDefault()
  }, [pan])

  /* node drag */
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation()
    draggingNode.current = nodeId
    dragStart.current = { x: e.clientX, y: e.clientY }
    const pos = positions.get(nodeId)
    dragNodeStart.current = { x: pos.x, y: pos.y }
  }, [positions])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy })
      }
      if (draggingNode.current) {
        const nodeId = draggingNode.current
        const dx = (e.clientX - dragStart.current.x) / zoom
        const dy = (e.clientY - dragStart.current.y) / zoom
        const base = allData[platform].layout.get(nodeId)
        if (!base) return
        const newX = dragNodeStart.current.x + dx
        const newY = dragNodeStart.current.y + dy
        setDragOffsets(prev => {
          const next = { ...prev }
          const map = new Map(next[platform])
          map.set(nodeId, { dx: newX - base.x, dy: newY - base.y })
          next[platform] = map
          return next
        })
      }
    }
    const handleMouseUp = () => {
      isPanning.current = false
      draggingNode.current = null
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [zoom, platform, allData])

  // SVG bounds
  const allPos = [...positions.values()]
  const svgW = allPos.length ? Math.max(...allPos.map(p => p.x)) + NODE_W + PAD * 2 : 800
  const svgH = allPos.length ? Math.max(...allPos.map(p => p.y)) + NODE_H + PAD * 2 : 600

  return (
    <div className="canvas-page">
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={onBack}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
            <path d="M10 12L6 8l4-4" />
          </svg>
          New Flow
        </button>

        <div className="toolbar-divider" />

        <div className="toolbar-platforms">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`toolbar-platform${platform === p.id ? ' active' : ''}`}
              onClick={() => setPlatform(p.id)}
            >
              {p.label}
              <span className="toolbar-platform-count">
                {allData[p.id].processed.length}
              </span>
            </button>
          ))}
        </div>

        <div className="toolbar-spacer" />

        <span className="toolbar-prompt">
          {prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt}
        </span>

        <button className="toolbar-btn toolbar-export" onClick={() => setShowExport(true)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
            <path d="M4 12h8M8 2v8M5 5l3-3 3 3" />
          </svg>
          Export Prompt
        </button>
      </div>

      <div
        className="canvas-viewport"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
      >
        <div
          className="canvas-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: svgW,
            height: svgH,
          }}
        >
          <svg className="canvas-svg" width={svgW} height={svgH}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0.8, 7 3, 0 5.2" fill="#B0ADA6" />
              </marker>
            </defs>

            {connections.map((conn, i) => {
              const fp = positions.get(conn.from)
              const tp = positions.get(conn.to)
              if (!fp || !tp) return null
              const { d, labelX, labelY } = buildPath(fp, tp, conn.fromPort)
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="#C8C5BD" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {conn.label && (
                    <text
                      x={labelX} y={labelY}
                      fontSize="10" fontWeight="600"
                      fontFamily="var(--font-body)"
                      fill={conn.label === 'Yes' ? '#16A34A' : '#DC2626'}
                    >{conn.label}</text>
                  )}
                </g>
              )
            })}
          </svg>

          {processed.map((node, i) => {
            const pos = positions.get(node.id)
            if (!pos) return null
            return (
              <div
                key={node.id}
                className="wf-node-wrapper"
                style={{
                  left: pos.x,
                  top: pos.y,
                  animationDelay: `${i * 60}ms`,
                  cursor: 'grab',
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <WorkflowNode node={node} />
              </div>
            )
          })}
        </div>

        <div className="canvas-zoom">
          <button onClick={() => setZoom(z => Math.min(z * 1.2, 2.5))}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.25))}>−</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="zoom-reset">Fit</button>
        </div>
      </div>

      {showExport && (
        <ExportPrompt
          nodes={processed}
          platform={platform}
          prompt={prompt}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
