'use client'

import { useState } from 'react'

export default function TestToolsPage() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResponse('')

    const formData = new FormData()
    formData.append('input', input)

    try {
      const res = await fetch('/api/chat-tools', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${await res.text()}`)
      }

      const aiResponse = await res.text();
      const transcript = decodeURIComponent(res.headers.get('X-Transcript') || '')

      setResponse(`Transcript: ${transcript}\n\nAI Response: ${aiResponse}`)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Todoist Tool Testing</h1>
      <p>Test the AI tool integration with Todoist</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., 'create a task to buy milk'"
          style={{ width: '400px', padding: '8px', marginRight: '10px' }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          <h2>Error</h2>
          <pre>{error}</pre>
        </div>
      )}

      {response && (
        <div style={{ marginTop: '20px' }}>
          <h2>Response</h2>
          <pre style={{ background: '#f0f0f0', padding: '10px', whiteSpace: 'pre-wrap' }}>{response}</pre>
        </div>
      )}
    </div>
  )
}