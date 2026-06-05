import MagicLinkForm from '../components/auth/MagicLinkForm'
import VideoSection from '../components/ui/VideoSection'

export default function AuthPage() {
  return (
    <div>

      {/* Section 1: Login */}
      <VideoSection src="/hero-v2.mp4" objectPosition="top" objectFit="contain">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl ring-2 ring-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.35)]">
              <img src="/logo.png" alt="Rex Casino" className="h-full w-full object-cover" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight">
                <span className="text-white">REX </span>
                <span className="text-orange-500">CASINO</span>
              </h1>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/70">
                Rex True Form
              </p>
            </div>
            <p className="text-slate-400 text-sm">Private prediction game · by invite only</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <MagicLinkForm />
          </div>
          <p className="text-center text-xs text-slate-500">
            No password. No account creation. Just your email.
          </p>
        </div>
      </VideoSection>

      {/* Section 2: Maradona */}
      <VideoSection src="/maradona-v2.mp4">
        <div className="flex flex-col items-center gap-4">
          <h2
            className="text-center font-black uppercase leading-tight"
            style={{
              fontSize: 'clamp(2.8rem, 12vw, 6rem)',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(160deg, #ffe066 0%, #ffd700 20%, #fff8a0 40%, #ffd700 55%, #c8960c 75%, #ffd700 90%, #ffe566 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 18px rgba(255,210,0,0.85)) drop-shadow(0 0 40px rgba(255,180,0,0.5))',
            }}
          >
            Hand of God
          </h2>
          <p className="text-orange-500 text-2xl font-black uppercase tracking-[0.25em] drop-shadow-[0_0_18px_rgba(249,115,22,0.6)]">Coming Soon</p>
        </div>
      </VideoSection>

      {/* Section 3: Pelé */}
      <VideoSection
        src="/pele-v2.mp4"
        sectionStyle={{ height: '110vw', minHeight: 0, background: '#000' }}
        videoStyle={{
          width: 'auto',
          height: 'auto',
          maxWidth: '70%',
          maxHeight: '70%',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
          objectFit: 'unset',
        }}
      >
        <p className="text-orange-500 text-3xl font-black uppercase tracking-[0.25em] drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]">Coming Soon</p>
      </VideoSection>

    </div>
  )
}
