import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">📬</div>
        <h3 className="text-xl font-semibold text-slate-50">Check your inbox</h3>
        <p className="text-sm text-slate-400">
          We sent a magic link to <span className="text-orange-400 font-medium">{email}</span>.
          <br />Tap it to sign in — no password needed.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-400"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
        autoFocus
        autoComplete="email"
      />
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Send magic link
      </Button>
    </form>
  )
}
