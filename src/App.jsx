import React, { useState } from 'react'
import Header from './components/Header'
import FormatterCore from './components/FormatterCore'
import { getProcessor } from './processors'

// Конфигурация страниц и их категорий
const PAGES = [
  { id: 'finance', title: 'Finance', categories: ['Finance', 'Health', 'Pets'] },
  { id: 'alpha', title: 'Alpha', categories: ['Alpha'] },
  { id: 'organic', title: 'Organic', categories: ['Organic'] },
  { id: 'redeagle', title: 'Redeagle', categories: ['Redeagle'] },
]

export default function App() {
  // Текущая активная страница
  const [currentPage, setCurrentPage] = useState('finance')

  // Текущая категория внутри активной страницы
  const [activeCategory, setActiveCategory] = useState('finance')

  // Глобальное состояние режима S3
  const [isS3Enabled, setIsS3Enabled] = useState(() => {
    return localStorage.getItem('s3_test_toggle_enabled') === 'true'
  })

  // Находим конфиг текущей страницы
  const activePageConfig = PAGES.find((p) => p.id === currentPage) || PAGES[0]

  // Обработчик переключения страниц верхнего меню
  const handlePageChange = (pageId) => {
    setCurrentPage(pageId)
    const targetConfig = PAGES.find((p) => p.id === pageId)
    if (targetConfig && targetConfig.categories.length > 0) {
      setActiveCategory(targetConfig.categories[0].toLowerCase())
    }
  }

  // Обработчик тумблера S3 Mode
  const handleS3ToggleChange = (checked) => {
    setIsS3Enabled(checked)
    localStorage.setItem('s3_test_toggle_enabled', checked)
  }

  // Берем нужный процессор обработки
  const currentProcessor = getProcessor(activeCategory)

  return (
    <div className='main-wrapper'>
      {/* 🧭 ХЕДЕР С НАВИГАЦИЕЙ И СЕЛЕКТОРОМ S3 🧭 */}
      <Header
        pages={PAGES}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isS3Enabled={isS3Enabled}
        onS3ToggleChange={handleS3ToggleChange}
      />

      {/* 📄 ОСНОВНОЕ ЯДРО СТРАНИЦЫ 📄 */}
      <FormatterCore
        processor={currentProcessor}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        availableCategories={activePageConfig.categories}
        isS3Enabled={isS3Enabled}
      />
    </div>
  )
}