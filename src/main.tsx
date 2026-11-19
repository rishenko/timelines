import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Boot } from './Boot.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { applyTheme, loadTheme } from './lib/theme.ts'

// The reader's saved theme (else the default) before the first render, so the page doesn't flash another one. A
// reader who never picked one gets the opened timeline's own theme once it has loaded (see Boot).
applyTheme(loadTheme().colors)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Boot />
    </ErrorBoundary>
  </StrictMode>,
)
