import React from 'react'

export default function Header({
  pages,
  currentPage,
  onPageChange,
  isS3Enabled,
  onS3ToggleChange
}) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* 🧭 НАВИГАЦИЯ СТРАНИЦ 🧭 */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={`main-btn main-btn_noicon category-wrap__link  ${currentPage === page.id ? '_active' : ''}`}
            onClick={() => onPageChange(page.id)}
            style={{
              padding: '8px 20px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <span>{page.title}</span>
          </button>
        ))}
      </div>

      {/* ☁️ СЕЛЕКТОР S3 STORAGE MODE ☁️ */}
      <div className="test-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: "'Roboto', Arial, sans-serif", fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
          ☁️ S3 Storage Mode (Beta):
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
        <span id="toggleStatus" style={{ fontFamily: "'Roboto', Arial, sans-serif", fontSize: '13px', fontWeight: 600, color: isS3Enabled ? '#d357d8' : '#75eaf6', transition: '.3s' }}>
          {isS3Enabled ? 'Storage Upload' : 'Download to PC'}
        </span>
      </div>
    </header>
  )
}