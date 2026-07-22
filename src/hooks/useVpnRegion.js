import { useState, useEffect, useCallback } from 'react'

const EU_COUNTRY_CODES = [
  'DE', 'FR', 'NL', 'GB', 'IT', 'ES', 'PL', 'BE', 'SE', 'AT',
  'CH', 'CZ', 'FI', 'DK', 'NO', 'IE', 'PT', 'RO', 'HU', 'GR'
]

export function useVpnRegion() {
  const [regionState, setRegionState] = useState({
    country: null,
    isUS: false,
    isEU: false,
    isInitialLoading: true, // 🔒 Показывает оверлей только при ПЕРВОМ запуске
    isRefreshing: false
  })

  const checkRegion = useCallback(async (isFirstRun = false) => {
    if (!isFirstRun) {
      setRegionState((prev) => ({ ...prev, isRefreshing: true }))
    }

    try {
      let countryCode = null

      // Попытка 1: ipwho.is
      try {
        const res = await fetch('https://ipwho.is/')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            countryCode = data.country_code
          }
        }
      } catch (e) {
        // Игнорируем и пробуем fallback
      }

      // Попытка 2: ip-api.com
      if (!countryCode) {
        const resFallback = await fetch('https://ip-api.com/json/?fields=status,countryCode')
        if (resFallback.ok) {
          const dataFallback = await resFallback.json()
          if (dataFallback.status === 'success') {
            countryCode = dataFallback.countryCode
          }
        }
      }

      const cleanCode = countryCode ? countryCode.toUpperCase() : 'UNKNOWN'
      const isUS = cleanCode === 'US'
      const isEU = EU_COUNTRY_CODES.includes(cleanCode)

      setRegionState({
        country: cleanCode,
        isUS,
        isEU,
        isInitialLoading: false,
        isRefreshing: false
      })
    } catch (err) {
      console.warn('⚠️ Ошибка GeoIP, безопасный дефолт (Finance):', err)
      setRegionState({
        country: 'UNKNOWN',
        isUS: false,
        isEU: false,
        isInitialLoading: false,
        isRefreshing: false
      })
    }
  }, [])

  useEffect(() => {
    // 1. Первичная проверка при старте
    checkRegion(true)

    // 2. Опрос раз в 8 секунд и ТОЛЬКО когда вкладка активна
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkRegion(false)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [checkRegion])

  return {
    ...regionState,
    refreshRegion: () => checkRegion(false)
  }
}