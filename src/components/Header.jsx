import React from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useVpnRegion } from '../hooks/useVpnRegion'


export default function Header({ isS3Enabled, onS3ToggleChange }) {
  const { country, isUS, isInitialLoading, isRefreshing, refreshRegion } = useVpnRegion()
  const location = useLocation()

  // Определяем, какую ОДНУ кнопку выводить в зависимости от URL
  const getSingleTab = () => {
    const path = location.pathname.toLowerCase()

    if (path === '/alpha') {
      return { title: 'Alpha', key: 'alpha' }
    }
    if (path === '/terra') {
      return { title: 'Terra', key: 'terra' }
    }
    // По умолчанию (для '/' и всех остальных путей)
    return { title: 'Finance', key: 'finance' }
  }

  const currentTab = getSingleTab()

  return (
    <>
      {/* 🔒 ПОЛНОЭКРАННАЯ БЛОКИРУЮЩАЯ ПОДЛОЖКА (При первой проверке IP) */}
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(15, 17, 23, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: '#ffffff',
              fontFamily: 'sans-serif'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTop: '3px solid #75eaf6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.5px' }}>
              🔍 Checking GeoIP & Security Region...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* 🧭 ЕДИНСТВЕННАЯ КНОПКА КАТЕГОРИИ 🧭 */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minHeight: '38px' }}>
            {!isInitialLoading && (
              <button
                type="button"
                className="main-btn main-btn_noicon category-wrap__link _active"
                style={{
                  position: 'relative',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'default',
                  background: 'transparent',
                }}
              >
                <motion.div
                  layoutId="activeHeaderTab"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>{currentTab.title}</span>
              </button>
            )}
          </div>

          {/* Индикатор региона */}
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 10px',
              borderRadius: '20px'
            }}
          >
            <span>
              IP: <strong>{isInitialLoading ? '...' : country || 'DEF'}</strong> {isUS ? '🇺🇸 (US Region)' : '🇪🇺/🌐 (EU Region)'}
            </span>
            <button
              type="button"
              onClick={refreshRegion}
              title="Refresh VPN check"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                padding: 0,
                lineHeight: 1,
                opacity: isRefreshing ? 0.4 : 1
              }}
            >
              🔄
            </button>
          </div>
        </div>

        {/* ☁️ TOGGLE S3 STORAGE ☁️ */}
        <div className="test-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: "'Roboto', Arial, sans-serif", fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
            ☁️ S3 Storage Mode:
          </span>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', margin: 0 }}>
            <input
              type="checkbox"
              id="s3UploadToggle"
              checked={isS3Enabled}
              onChange={(e) => onS3ToggleChange(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider" style={{ border: isS3Enabled ? '1px solid #fff' : '1px solid #ccc' }}></span>
          </label>

          <div style={{ position: 'relative', overflow: 'hidden', height: '20px', display: 'flex', alignItems: 'center' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isS3Enabled ? 'storage' : 'pc'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: "'Roboto', Arial, sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isS3Enabled ? '#d357d8' : '#75eaf6',
                  display: 'inline-block',
                }}
              >
                {isS3Enabled ? 'Storage Upload' : 'Download to PC'}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  )
}