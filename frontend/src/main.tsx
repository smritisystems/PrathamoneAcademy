/**
 * @file        main.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.root
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-26
 *
 * @description Vite React application entry point initializing DOM root, query client, and global styles.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SafeToaster from './components/common/SafeToaster'
import App from './App'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'
import { printConsoleBrandingBanner } from './utils/consoleBanner'
import { initializeAppearance } from './store/appearanceStore'
import { installGlobalErrorBridge } from './utils/errorTaxonomy'

// Print official application startup banner and bind desktop WebView2 error bridge
printConsoleBrandingBanner()
initializeAppearance()
installGlobalErrorBridge()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Avoid retrying terminal authentication or not-found errors
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 1
      },
      staleTime: 15_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <SafeToaster
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

