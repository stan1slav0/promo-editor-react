import React from 'react'
import { Navigate } from 'react-router-dom'
import { useVpnRegion } from '../hooks/useVpnRegion'

export function ProtectedRoute({ children }) {
  const { isUS, isInitialLoading } = useVpnRegion()

  if (isInitialLoading) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 70px)',
          width: '100%',
          visibility: 'hidden'
        }}
      />
    )
  }

  // if (!isUS) {
  //   return <Navigate to="/" replace />
  // }

  return children
}