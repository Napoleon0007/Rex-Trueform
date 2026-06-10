import { Component, ErrorInfo, ReactNode } from 'react'

type Props = {
  children: ReactNode
  // Static node, or a render fn that receives the caught error.
  fallback: ReactNode | ((error: Error) => ReactNode)
  onError?: (error: Error, info: ErrorInfo) => void
}

type State = { error: Error | null }

// React unmounts an entire subtree when a render throws and nothing catches it —
// which is exactly how the 3D race page went fully black on phones that can't
// allocate its WebGL pipeline. This boundary catches that throw and shows a
// fallback instead, so a heavy feature can degrade gracefully rather than blank
// the whole screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    const { error } = this.state
    if (error) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(error)
        : this.props.fallback
    }
    return this.props.children
  }
}
