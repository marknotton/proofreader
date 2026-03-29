/**
 * Entry point for the Proofreader Chrome extension application.
 *
 * Initializes React with the root DOM element and wraps the application
 * with necessary providers (StrictMode for development checks and I18nProvider
 * for internationalization support).
 *
 * @module main
 */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { I18nProvider } from "./context/I18nContext"

/**
 * Initialize and mount the React application.
 *
 * Sets up the React root on the DOM element with ID "root" and wraps it with
 * StrictMode for development-time checks and I18nProvider for localization support.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
)
