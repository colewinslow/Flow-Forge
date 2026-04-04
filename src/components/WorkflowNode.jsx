import {
  Zap, FileText, Globe, Code, Mail, MessageSquare,
  GitBranch, Clock, Settings, Database, Sparkles,
  Calendar, Table, UserPlus, Circle, Timer, Hash,
  ArrowRightLeft
} from 'lucide-react'

const TYPE_ICONS = {
  webhook_trigger: Zap,
  form_trigger: FileText,
  schedule_trigger: Timer,
  http_request: Globe,
  code: Code,
  send_email: Mail,
  send_sms: MessageSquare,
  condition: GitBranch,
  delay: Clock,
  set_variable: Settings,
  database: Database,
  ai_call: Sparkles,
  calendar: Calendar,
  spreadsheet: Table,
  crm_update: UserPlus,
  slack: Hash,
  transform: ArrowRightLeft,
}

const TYPE_COLORS = {
  webhook_trigger:  { color: '#B45309', bg: '#FFFBEB' },
  form_trigger:     { color: '#B45309', bg: '#FFFBEB' },
  schedule_trigger: { color: '#B45309', bg: '#FFFBEB' },
  http_request:     { color: '#1D4ED8', bg: '#EFF6FF' },
  code:             { color: '#6D28D9', bg: '#F5F3FF' },
  send_email:       { color: '#047857', bg: '#ECFDF5' },
  send_sms:         { color: '#047857', bg: '#ECFDF5' },
  condition:        { color: '#D97706', bg: '#FFFBEB' },
  delay:            { color: '#475569', bg: '#F8FAFC' },
  set_variable:     { color: '#6D28D9', bg: '#F5F3FF' },
  database:         { color: '#1D4ED8', bg: '#EFF6FF' },
  ai_call:          { color: '#7C3AED', bg: '#F5F3FF' },
  calendar:         { color: '#0D9488', bg: '#F0FDFA' },
  spreadsheet:      { color: '#1D4ED8', bg: '#EFF6FF' },
  crm_update:       { color: '#047857', bg: '#ECFDF5' },
  slack:            { color: '#9333EA', bg: '#FAF5FF' },
  transform:        { color: '#475569', bg: '#F8FAFC' },
}

const DEFAULT_COLORS = { color: '#475569', bg: '#F8FAFC' }

export const NODE_W = 260
export const NODE_H = 140

export default function WorkflowNode({ node }) {
  const Icon = TYPE_ICONS[node.type] || Circle
  const colors = TYPE_COLORS[node.type] || DEFAULT_COLORS
  const isBranch = node.type === 'condition' && node.branch

  return (
    <div
      className="wf-node"
      style={{ '--node-color': colors.color, '--node-bg': colors.bg }}
    >
      <div className="wf-port wf-port-in" />

      <div className="wf-node-body">
        <div className="wf-node-header">
          <div className="wf-node-icon" style={{ background: colors.bg }}>
            <Icon size={16} color={colors.color} strokeWidth={2} />
          </div>
          <span className="wf-node-type">
            {node.platform_label || node.type.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="wf-node-name">{node.name || node.label}</div>
        <div className="wf-node-desc">{node.description}</div>
      </div>

      {isBranch ? (
        <>
          <div className="wf-port wf-port-out wf-port-true" />
          <div className="wf-port wf-port-out wf-port-false" />
        </>
      ) : (
        <div className="wf-port wf-port-out" />
      )}
    </div>
  )
}
