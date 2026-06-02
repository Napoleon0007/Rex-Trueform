import { createPortal } from 'react-dom'
import { useToastStore, type ToastVariant } from '../../store/toastStore'

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error:   'border-rose-500/30 bg-rose-500/10 text-rose-300',
  info:    'border-orange-500/30 bg-orange-500/10 text-orange-300',
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()
  if (toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/40 backdrop-blur-md animate-slide-up ${variantStyles[t.variant]}`}
        >
          {t.emoji && <span className="text-base leading-none">{t.emoji}</span>}
          <span>{t.message}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
