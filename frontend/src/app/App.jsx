import { useEffect } from 'react'
import './App.css'
import AppRoutes from './app.route'
import { useAuth } from './features/auth/hooks/use.auth'

function App() {
  const { handleGetMe } = useAuth()

  useEffect(() => {
    handleGetMe()
  }, [])

  return (
    <>
      <AppRoutes/>
    </>
  )
}

export default App
