import { useRef, useState } from 'react'
import { useUpdateAvatar } from '../../hooks/useAvatar'
import { useAuthStore } from '../../store/authStore'

// Mandatory first-run gate: a new member must choose a profile picture from
// their camera roll before they can enter. The image is what shows on the
// Hall of Fame / Wall of Shame, so there's no skipping it.
export default function OnboardingAvatar() {
  const { profile } = useAuthStore()
  const update = useUpdateAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('That’s not an image — pick a photo.'); return }
    if (f.size > 20 * 1024 * 1024) { setErr('That photo is huge — pick one under 20MB.'); return }
    setErr(null)
    setFile(f)
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f) })
  }

  async function confirm() {
    if (!file) return
    setErr(null)
    try {
      await update.mutateAsync(file) // success flips profile.avatar_url → gate lets them in
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed — try again.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-casino-night px-6 py-10 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-500/80">Rex Trueform</p>
      <h1 className="mt-2 text-2xl font-black text-white">
        Welcome, <span className="text-orange-500">{profile?.display_name ?? 'player'}</span>
      </h1>
      <p className="mt-2 max-w-xs text-sm text-slate-400">
        Pick a profile picture to get in. This is the mugshot that goes up on the
        <span className="text-amber-300"> Hall of Fame</span> — and the
        <span className="text-rose-300"> Wall of Shame</span>. Choose wisely.
      </p>

      {/* Preview disc */}
      <button
        onClick={() => inputRef.current?.click()}
        className="group relative mt-8 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-orange-500/50 bg-casino-card transition-colors hover:border-orange-500"
      >
        {preview ? (
          <img src={preview} alt="your pick" className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-xs text-slate-500 group-hover:text-slate-300">📷<br />Tap to choose<br />from camera roll</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />

      {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        {preview && (
          <button
            onClick={confirm}
            disabled={update.isPending}
            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-orange-400 disabled:opacity-60"
          >
            {update.isPending ? 'Uploading…' : 'Use this photo →'}
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-casino-line bg-casino-card px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
        >
          {preview ? 'Choose a different photo' : 'Choose from camera roll'}
        </button>
      </div>
    </div>
  )
}
