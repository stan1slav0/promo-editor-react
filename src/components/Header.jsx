import React from 'react'
import { useLocation } from 'react-router-dom'

export default function Header({ isS3Enabled, onS3ToggleChange }) {
  const location = useLocation()

  const getSingleTab = () => {
    const path = location.pathname.toLowerCase()

    if (path === '/alpha') {
      return { title: 'Alpha', key: 'alpha', mark: 'A', index: '02' }
    }
    if (path === '/terra') {
      return { title: 'Terra', key: 'terra', mark: 'T', index: '03' }
    }
    if (path === '/red') {
      return { title: 'Red Eagle', key: 'red', mark: 'R', index: '04' }
    }
    return { title: 'EPC Main', key: 'finance', mark: 'EPC', index: '01' }
  }

  const currentTab = getSingleTab()

  return (
    <header className="header">
      <div className="header_wrapper">
        <div className="header-product">
          <div
            className={`workspace-card workspace-card_${currentTab.key}`}
            role="status"
            aria-label={`Current workspace: ${currentTab.title}`}
          >
            <span className="workspace-card__mark" aria-hidden="true">
              <span>{currentTab.mark}</span>
            </span>
            <span className="workspace-card__copy">
              <span className="workspace-card__title">{currentTab.title}</span>
            </span>
          </div>
        </div>

        <label className="test-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', margin: 0 }}>
            <input
              type="checkbox"
              id="s3UploadToggle"
              checked={isS3Enabled}
              onChange={(e) => onS3ToggleChange(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider" style={{ border: isS3Enabled ? '1px solid #fff' : '1px solid #ccc' }}></span>
          </span>

          <span style={{ position: 'relative', overflow: 'hidden', height: '20px', display: 'flex', alignItems: 'center' }}>
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
          </span>
        </label>
      </div>
    </header>
  )
}
