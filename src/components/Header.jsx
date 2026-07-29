import React from 'react'
import { useLocation } from 'react-router-dom'

export default function Header({ isS3Enabled, onS3ToggleChange }) {
  const location = useLocation()

  const getSingleTab = () => {
    const path = location.pathname.toLowerCase()

    if (path === '/alpha') {
      return { title: 'Alpha', key: 'alpha' }
    }
    if (path === '/terra') {
      return { title: 'Terra', key: 'terra' }
    }
    if (path === '/red') {
      return { title: 'Red Eagle', key: 'red' }
    }
    return { title: 'EPC Main', key: 'finance' }
  }

  const currentTab = getSingleTab()

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '300px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minHeight: '38px', width: '100%' }}>
          <button
            type="button"
            className="main-btn main-btn_noicon category-wrap__link _active"
            style={{
              position: 'relative',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'default',
              background: 'transparent',
              width: '100%'
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>{currentTab.title}</span>
          </button>
        </div>
      </div>

      <div className="test-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isS3Enabled ? '#d357d8' : '#75eaf6',
              display: 'inline-block',
              transition: 'color 0.2s ease, opacity 0.2s ease',
            }}
          >
            {isS3Enabled ? 'Storage' : 'Desktop'}
          </span>
        </div>
      </div>
    </header>
  )
}