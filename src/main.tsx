import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'

const requiredEnvironmentKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

const environment = import.meta.env as Record<string, string | undefined>
const missingEnvironmentKeys = requiredEnvironmentKeys.filter(key => {
  const value = environment[key]
  return !value || value.startsWith('your_')
})

function ConfigurationError({ details }: { details: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">DentalCare HMIS configuration required</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{details}</p>
        {missingEnvironmentKeys.length > 0 && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            Missing environment settings: {missingEnvironmentKeys.join(', ')}
          </div>
        )}
        <p className="mt-5 text-sm text-gray-500">
          Check <strong>.env</strong>, ensure your Supabase URL and Anon Key are set, and restart the Vite server.
        </p>
      </section>
    </main>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

function renderApplication(App: React.ComponentType) {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
            success: { style: { background: '#059669' } },
            error: { style: { background: '#dc2626' } },
          }}
        />
      </BrowserRouter>
    </React.StrictMode>,
  )
}

if (missingEnvironmentKeys.length > 0) {
  root.render(<ConfigurationError details="The application cannot start until its Supabase environment variables are configured." />)
} else {
  import('./App')
    .then(({ default: App }) => renderApplication(App))
    .catch(error => {
      console.error('Failed to initialize the application:', error)
      root.render(<ConfigurationError details="The application could not be initialized. Check the Supabase values in .env and restart the dev server." />)
    })
}
