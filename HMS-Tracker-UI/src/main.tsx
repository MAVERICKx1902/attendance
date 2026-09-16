import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AttendanceProvider } from './store/AttendanceStore'
import ErrorBoundary from './components/shared/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AttendanceProvider>
        <App />
      </AttendanceProvider>
    </ErrorBoundary>
  </StrictMode>,
)
