import React from 'react'
import { Navigate } from 'react-router-dom'
import { useVpnRegion } from '../hooks/useVpnRegion'


export function ProtectedRoute({ children }) {
  const { isUS, isInitialLoading } = useVpnRegion()

  // Пока идет первичная проверка IP — ничего не рендерим (подложка из Header перекроет экран)
  if (isInitialLoading) return null

  // Если не US VPN — отправляем на главную
  if (!isUS) {
    return <Navigate to="/" replace />
  }

  return children
}