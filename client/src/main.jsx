import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './shared/context/ThemeContext.jsx'
import { UserProvider } from './shared/context/UserContext.jsx'
import { SocketProvider } from './shared/context/SocketContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
)
