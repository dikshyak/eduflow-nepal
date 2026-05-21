import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { api } from '../api'

const SUGGESTIONS = [
  "Which students have attendance below 75%?",
  "Who scored the highest marks in Mathematics?",
  "How many students are in Grade 10?",
  "List all students with overdue fees",
  "Who was absent today?",
  "Show top 5 students by marks",
]

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hello! I'm your AI school assistant. Ask me anything about students, attendance, marks, or fees.",
      sql: null,
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (question) => {
    const q = question || input.trim()
    if (!q) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.askAI(q)
      setMessages(m => [...m, {
        role: 'ai',
        text: res.data.answer,
        sql: res.data.sql_used,
        count: res.data.row_count,
      }])
    } catch (e) {
      const detail = e.response?.data?.detail
      setMessages(m => [...m, {
        role: 'ai',
        text: detail || 'Sorry, something went wrong. Please try again.',
        sql: null,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>AI Assistant</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
          Ask questions about your school data in plain English
        </p>
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Try asking
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '5px 12px' }}>
                <Sparkles size={12} /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
        marginBottom: 16,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12,
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'ai' ? 'var(--primary)' : 'var(--bg3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {m.role === 'ai'
                ? <Bot size={16} color="white" />
                : <User size={16} color="var(--text2)" />
              }
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: '70%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 12,
                background: m.role === 'user' ? 'var(--primary)' : 'var(--bg2)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                color: m.role === 'user' ? 'white' : 'var(--text)',
                fontSize: 13, lineHeight: 1.6,
              }}>
                {m.text}
              </div>
              {m.sql && (
                <div style={{
                  marginTop: 6, padding: '6px 10px',
                  background: 'var(--bg3)', borderRadius: 6,
                  fontSize: 11, fontFamily: 'monospace',
                  color: 'var(--text3)', wordBreak: 'break-all',
                }}>
                  SQL: {m.sql}
                </div>
              )}
              {m.count !== undefined && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {m.count} result{m.count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text3)',
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10,
        padding: '12px 16px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
      }}>
        <input
          className="input"
          style={{ flex: 1, border: 'none', background: 'transparent', padding: '4px 0' }}
          placeholder="Ask anything about your school data..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="btn btn-primary" style={{ flexShrink: 0 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}