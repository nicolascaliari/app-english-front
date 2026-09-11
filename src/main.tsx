import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'

// Home-screen apps on iOS are resumed rather than reloaded, so without an
// explicit check they keep running an old build. Look for a new deploy on
// launch and whenever the app comes back to the foreground; with
// registerType 'autoUpdate' the page reloads itself once the new one takes over.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => undefined)
      }
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
