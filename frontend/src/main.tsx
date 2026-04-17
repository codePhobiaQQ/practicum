import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.tsx'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@app/providers'
import { AppStateProvider } from '@app/contexts'
import { antdConfig } from '@/app/providers/antd.ts'
import { ConfigProvider } from 'antd'
import { NotificationProvider } from '@app/providers'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppStateProvider>
        <BrowserRouter future={{ v7_startTransition: true }} basename="/">
          <ConfigProvider theme={antdConfig}>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </ConfigProvider>
        </BrowserRouter>
      </AppStateProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
