import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import FormatterCore from './components/FormatterCore'
import { getProcessor } from './processors'
import BackgroundCanvas from './components/BackgroundCanvas'
import { ProtectedRoute } from './components/ProtectedRoute'

// Конфигурация страниц и их категорий
const PAGES = [
  { id: 'finance', title: 'Finance', path: '/', categories: ['Finance', 'Health', 'Pets'] },
  { id: 'alpha', title: 'Alpha', path: '/alpha', categories: ['Alpha'] },
  { id: 'organic', title: 'Terra', path: '/terra', categories: ['Terra'] },
]

// Подкомпонент для синхронизации URL и состояния категории/фона
function PageContent({ pageConfig, activeCategory, onCategoryChange, isS3Enabled }) {
  const location = useLocation()

  // При смене URL автоматически выставляем соответствующую категорию и класс фона
  useEffect(() => {
    if (pageConfig && pageConfig.categories.length > 0) {
      const defaultCategory = pageConfig.categories[0].toLowerCase()
      onCategoryChange(defaultCategory)
    }

    // Динамически меняем класс фона у .main-wrapper
    const wrapper = document.querySelector('.main-wrapper')
    if (wrapper) {
      wrapper.classList.remove('bg-finance', 'bg-alpha', 'bg-terra', 'bg-organic')
      wrapper.classList.add(`bg-${pageConfig.id}`)
    }
  }, [location.pathname, pageConfig])

  const currentProcessor = getProcessor(activeCategory)

  return (
    <FormatterCore
      processor={currentProcessor}
      activeCategory={activeCategory}
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

  const handleCategoryChange = (newCategory) => {
    if (!newCategory) return
    const lower = newCategory.toLowerCase()
    setActiveCategory(lower)
    localStorage.setItem('selectedCategory', lower)
  }

  const handleS3ToggleChange = (checked) => {
    setIsS3Enabled(checked)
    localStorage.setItem('s3_test_toggle_enabled', checked)
  }

  const financeConfig = PAGES.find((p) => p.id === 'finance')
  const alphaConfig = PAGES.find((p) => p.id === 'alpha')
  const terraConfig = PAGES.find((p) => p.id === 'organic')

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="main-wrapper">
        <div className="canvas-pattern">
          <BackgroundCanvas />
        </div>

        <Header
          isS3Enabled={isS3Enabled}
          onS3ToggleChange={handleS3ToggleChange}
        />

        <Routes>
          {/* Пути внутри Routes остаются чистыми (/ , /alpha, /terra) */}
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
              <ProtectedRoute>
                <PageContent
                  pageConfig={alphaConfig}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  isS3Enabled={isS3Enabled}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/terra"
            element={
              <ProtectedRoute>
                <PageContent
                  pageConfig={terraConfig}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  isS3Enabled={isS3Enabled}
                />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}