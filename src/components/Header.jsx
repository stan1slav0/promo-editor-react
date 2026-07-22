import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
        {pages.map((page) => {
          const isActive = currentPage === page.id

          return (
            <button
              key={page.id}
              type="button"
              className={`main-btn main-btn_noicon category-wrap__link ${isActive ? '_active' : ''}`}
              onClick={() => onPageChange(page.id)}
              style={{
                position: 'relative',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeHeaderTab"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span style={{ position: 'relative', zIndex: 1 }}>{page.title}</span>
            </button>
          )
        })}
      </div>

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
  )
}