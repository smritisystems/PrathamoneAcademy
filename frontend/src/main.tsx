/**
 * @file        main.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.root
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-05
 *
 * @description Vite React application entry point initializing DOM root, query client, and global styles.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'
import { printConsoleBrandingBanner } from './utils/consoleBanner'

// Print official application startup banner in browser console
printConsoleBrandingBanner()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Avoid retrying terminal authentication or not-found errors
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 1
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

// Register PWA service worker
registerServiceWorker()

