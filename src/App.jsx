import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import FormatterCore from './components/FormatterCore'
import { getProcessor } from './processors'
import BackgroundCanvas from './components/BackgroundCanvas'

// Конфигурация страниц и их категорий
const PAGES = [
  { id: 'finance', title: 'Finance', categories: ['Finance', 'Health', 'Pets'] },
  { id: 'alpha', title: 'Alpha', categories: ['Alpha'] },
  { id: 'organic', title: 'Terra', categories: ['Terra'] },
]

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

  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('selectedPage') || 'finance'
  })

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

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId)
    localStorage.setItem('selectedPage', pageId)

    const targetConfig = PAGES.find((p) => p.id === pageId)
    if (targetConfig && targetConfig.categories.length > 0) {
      const firstCategory = targetConfig.categories[0].toLowerCase()
      setActiveCategory(firstCategory)
      localStorage.setItem('selectedCategory', firstCategory)
    }
  }

  const handleS3ToggleChange = (checked) => {
    setIsS3Enabled(checked)
    localStorage.setItem('s3_test_toggle_enabled', checked)
  }

  const activePageConfig = PAGES.find((p) => p.id === currentPage) || PAGES[0]

  const currentProcessor = getProcessor(activeCategory)

  return (
    <div className='main-wrapper'>
      <div className="canvas-pattern">
        <BackgroundCanvas />
      </div>
      <Header
        pages={PAGES}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isS3Enabled={isS3Enabled}
        onS3ToggleChange={handleS3ToggleChange}
      />

      <FormatterCore
        processor={currentProcessor}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        availableCategories={activePageConfig.categories}
        isS3Enabled={isS3Enabled}
      />
    </div>
  )
}