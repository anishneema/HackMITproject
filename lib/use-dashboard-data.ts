'use client'

import { useEffect, useState } from 'react'
import { useDashboardStore } from './dashboard-store'

export function useDashboardData() {
  const {
    events,
    campaigns,
    bookings,
    activities,
    isLoading,
    error,
    refreshDashboard,
    getDashboardTotals
  } = useDashboardStore()

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      console.log('Initializing dashboard data from API...')
      refreshDashboard()
        .then(() => {
          console.log('Dashboard data loaded from API successfully')
          setInitialized(true)
        })
        .catch((error) => {
          console.error('Failed to initialize dashboard data:', error)
          setInitialized(true) // Set to true even on error to prevent infinite retries
        })
    }
  }, [initialized, refreshDashboard])

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    if (initialized) {
      const intervalId = setInterval(() => {
        console.log('Refreshing dashboard data...')
        refreshDashboard().catch(error => {
          console.error('Periodic refresh failed:', error)
        })
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(intervalId)
    }
  }, [initialized, refreshDashboard])

  const totals = getDashboardTotals()

  return {
    events,
    campaigns,
    bookings,
    activities,
    isLoading,
    error,
    totals,
    initialized,
    refreshDashboard
  }
}