import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Boot } from './Boot.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { applyTheme, loadTheme, themeHint } from './lib/theme.ts'

// The reader's saved theme before the first render, so the page doesn't flash another one. A reader who never picked
// one gets the theme this page opened with last time (else the default); Boot applies the timeline's own theme as
// soon as it knows it.
applyTheme(loadTheme(themeHint(new URLSearchParams(window.location.search).get('timeline'))).colors)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Boot />
    </ErrorBoundary>
  </StrictMode>,
)
