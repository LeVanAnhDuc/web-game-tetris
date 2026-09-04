import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n'
import { SettingsProvider, useSettings } from './settings'
import { PlayScreen } from './ui/PlayScreen'
import './ui/tokens.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

/**
 * The locale now comes from settings rather than straight from the browser (FR-28).
 * The browser is still where it starts -- `SettingsProvider` detects it and stores
 * it -- but once a player has chosen, their choice is what the app reads.
 */
function App() {
  const { settings } = useSettings()
  // In an effect, not the render body: writing to the document while rendering is a
  // side effect React is free to run twice or discard.
  useEffect(() => {
    document.documentElement.lang = settings.locale
  }, [settings.locale])
  return (
    <I18nProvider locale={settings.locale}>
      <PlayScreen />
    </I18nProvider>
  )
}

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
