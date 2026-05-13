import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { WorkspaceProvider } from './features/workspaces/WorkspaceContext'
import { initTheme } from './hooks/useTheme'
import { I18nProvider } from './i18n'
import './index.css'
import '@xyflow/react/dist/style.css'

// Apply stored theme before first render (prevents flash)
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'toast-themed',
                style: {},
              }}
            />
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>,
)
