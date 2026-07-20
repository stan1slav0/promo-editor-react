import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Подключаем только реальные файлы стилей
import './css/style.css'
import './css/mediaqueries.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)