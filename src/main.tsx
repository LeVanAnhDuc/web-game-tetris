import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider, detectLocale } from './i18n'
import { PlayScreen } from './ui/PlayScreen'
import './ui/tokens.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

// Detected once. The language switch is FR-28, a later feature.
const locale = detectLocale()
document.documentElement.lang = locale

createRoot(root).render(
  <StrictMode>
    <I18nProvider locale={locale}>
      <PlayScreen />
    </I18nProvider>
  </StrictMode>,
)
