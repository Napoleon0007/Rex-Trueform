import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import App from './App'
import './index.css'

Sentry.init({
  dsn: 'https://6bdee02935c5c150bce94b2f304784ae@o4511446289350656.ingest.us.sentry.io/4511446292561920',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  </React.StrictMode>,
)
