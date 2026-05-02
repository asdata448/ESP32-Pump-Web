'use client'

import { useEffect, useState } from 'react'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    // Only register service worker in production and when supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })

          console.log('[SW] Service worker registered:', registration.scope)

          // Wait for service worker to be ready
          if (registration.active) {
            setSwReady(true)
          } else {
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'activated') {
                    setSwReady(true)
                  }
                })
              }
            })
          }

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  console.log('[SW] New version available')
                  // You can show a notification to the user here
                }
              })
            }
          })
        } catch (error) {
          console.error('[SW] Service worker registration failed:', error)
        }
      }

      // Register immediately
      registerSW()

      // Also register on page visibility change (for iOS Safari)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          registerSW()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  return <>{children}</>
}
