import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import FormatterCore from './components/FormatterCore'
import { getProcessor } from './processors'
import BackgroundCanvas from './components/BackgroundCanvas'

import { ToastContainer } from 'react-toastify'

const PAGES = [
  { id: 'finance', title: 'Finance', path: '/', categories: ['Finance', 'Health', 'Pets'] },
  { id: 'alpha', title: 'Alpha', path: '/alpha', categories: ['Alpha'] },
  { id: 'organic', title: 'Terra', path: '/terra', categories: ['Terra'] },
  { id: 'red', title: 'Red', path: '/red', categories: ['Red'] },
]

function MainLayout({ children }) {
  const location = useLocation()

  const getBgClass = (pathname) => {
    const path = pathname.toLowerCase()
    if (path.includes('/alpha')) return 'bg-alpha'
    if (path.includes('/terra')) return 'bg-organic'
    if (path.includes('/red')) return 'bg-red'
    return 'bg-finance'
  }

  const bgClass = getBgClass(location.pathname)

  useLayoutEffect(() => {
    const wrapper = document.querySelector('.main-wrapper')
    if (wrapper) {
      wrapper.className = `main-wrapper ${bgClass}`
    }
  }, [bgClass])

  return (
    <div className={`main-wrapper ${bgClass}`}>
      <div className="canvas-pattern">
        <BackgroundCanvas />
      </div>
      {children}
    </div>
  )
}

function PageContent({ pageConfig, activeCategory, onCategoryChange, isS3Enabled }) {
  const location = useLocation()
  const categories = pageConfig.categories.map((category) => category.toLowerCase())
  const defaultCategory = categories[0]
  const effectiveCategory = categories.includes(activeCategory?.toLowerCase())
    ? activeCategory.toLowerCase()
    : defaultCategory

  useEffect(() => {
    if (defaultCategory) {
      onCategoryChange(defaultCategory)
    }
  }, [location.pathname, defaultCategory, onCategoryChange])

  const currentProcessor = getProcessor(effectiveCategory)

  return (
    <FormatterCore
      processor={currentProcessor}
      activeCategory={effectiveCategory}
      onCategoryChange={onCategoryChange}
      availableCategories={pageConfig.categories}
      isS3Enabled={isS3Enabled}
    />
  )
}

export default function App() {
  useEffect(() => {
    let key = localStorage.getItem('license_key')

    while (!key || !key.trim()) {
      key = prompt('🔑 Enter S3 License Key:')
      if (key && key.trim()) {
        localStorage.setItem('license_key', key.trim())
      } else {
        alert('S3 License Key!')
      }
    }
  }, [])

  const [activeCategory, setActiveCategory] = useState(() => {
    const saved = localStorage.getItem('selectedCategory')
    return saved ? saved.toLowerCase() : 'finance'
  })

  const [isS3Enabled, setIsS3Enabled] = useState(() => {
    return localStorage.getItem('s3_test_toggle_enabled') === 'true'
  })

  const handleCategoryChange = useCallback((newCategory) => {
    if (!newCategory) return
    const lower = newCategory.toLowerCase()
    setActiveCategory(lower)
    localStorage.setItem('selectedCategory', lower)
  }, [])

  const handleS3ToggleChange = (checked) => {
    setIsS3Enabled(checked)
    localStorage.setItem('s3_test_toggle_enabled', checked)
  }

  const financeConfig = PAGES.find((p) => p.id === 'finance')
  const alphaConfig = PAGES.find((p) => p.id === 'alpha')
  const terraConfig = PAGES.find((p) => p.id === 'organic')
  const redConfig = PAGES.find((p) => p.id === 'red')

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <MainLayout>
        <Header
          isS3Enabled={isS3Enabled}
          onS3ToggleChange={handleS3ToggleChange}
        />

        <Routes>
          <Route
            path="/"
            element={
              <PageContent
                pageConfig={financeConfig}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                isS3Enabled={isS3Enabled}
              />
            }
          />
          <Route
            path="/alpha"
            element={
              <PageContent
                pageConfig={alphaConfig}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                isS3Enabled={isS3Enabled}
              />
            }
          />
          <Route
            path="/terra"
            element={
              <PageContent
                pageConfig={terraConfig}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                isS3Enabled={isS3Enabled}
              />
            }
          />
          <Route
            path="/red"
            element={
              <PageContent
                pageConfig={redConfig}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                isS3Enabled={isS3Enabled}
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </MainLayout>
    </BrowserRouter>
  )
}
