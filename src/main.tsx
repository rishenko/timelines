import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Boot } from './Boot.tsx'
import { applyTheme, loadTheme } from './lib/theme.ts'
import { findTimeline } from './timelines/index.ts'

// Apply the theme before the first render so the page doesn't flash another theme:
// the reader's saved choice, else the timeline's own default.
const timeline = findTimeline(new URLSearchParams(window.location.search).get('timeline'))
applyTheme(loadTheme(timeline.dataset.meta.defaultTheme).colors)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
