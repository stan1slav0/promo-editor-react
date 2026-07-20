import React, { useState, useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import { uploadImagesToS3 } from '../utils/s3Uploader'
import { getBlobFromSrc, toJpeg600, injectMetadata } from '../utils/imageProcessor'

export default function FormatterCore({
  processor,
  activeCategory,
  onCategoryChange,
  availableCategories = ['Finance', 'Health', 'Pets'],
  isS3Enabled
}) {
  const [fileName, setFileName] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [htmlOutput, setHtmlOutput] = useState('')
  const [mjmlOutput, setMjmlOutput] = useState('')
  const [logText, setLogText] = useState('')

  const editorRef = useRef(null)
  const isFirstRender = useRef(true) // Флаг, чтобы пропускать вывод лога при первом запуске страницы
  const supportsMJML = processor?.hasMJML !== false

  useEffect(() => {
    if (processor) {
      processor.categoryName = activeCategory
    }
  }, [activeCategory, processor])

  // Подсчет картинок для вывода статуса в лог
  const updateImageCountLog = () => {
    if (!editorRef.current) return
    const imgs = editorRef.current.querySelectorAll('img')
    const count = imgs.length

    if (count > 0) {
      const word = count === 1 ? 'image' : 'images'
      setLogText(`${count} ${word} ready ✅<br>`)
    } else {
      setLogText('')
    }
  }

  // 🔥 ВЫВОД СТАТУСА ПРИ ПЕРЕКЛЮЧЕНИИ S3 С АВТОВОЗВРАТОМ К ТЕКУЩЕМУ СТАТУСУ РЕДАКТОРА 🔥
  useEffect(() => {
    // Пропускаем вывод лога при самой первой загрузке компонента
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // 1. Показываем временный статус переключения S3 Mode
    if (isS3Enabled) {
      setLogText('☁️ Auto-upload to S3 mode activated!<br>')
    } else {
      setLogText('💻 Download to local PC mode restored.<br>')
    }

    // 2. Через 2.5 секунды возвращаем статус о количестве картинок
    const timer = setTimeout(() => {
      updateImageCountLog()
    }, 1500)

    return () => clearTimeout(timer) // Очищаем таймер при быстром повторном клике
  }, [isS3Enabled])

  const handleEditorInput = (e) => {
    setEditorContent(e.currentTarget.innerHTML)
    updateImageCountLog()
  }

  const getFormattedName = () => {
    const raw = fileName.trim() || 'PROMO'
    return raw.replace(/\s+/g, '').toUpperCase()
  }

  const changeNumber = (amount) => {
    const match = fileName.match(/(\D*)(\d+)/)
    if (match) {
      const textPart = match[1]
      const numberPart = (parseInt(match[2], 10) || 0) + amount
      setFileName(textPart + numberPart)
    } else if (!fileName) {
      setFileName('PROMO1')
    }
  }

  const getRawContent = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() !== '') {
      return editorRef.current.innerHTML
    }
    return editorContent
  }

  // Генерация HTML
  const generateHTMLCode = async () => {
    if (!processor) throw new Error('No processor attached')
    const rawHtml = getRawContent()
    if (!rawHtml.trim()) throw new Error('Text editor is empty')

    const formattedName = getFormattedName()
    const prettyHtml = await processor.exportHTML(rawHtml, formattedName)
    setHtmlOutput(prettyHtml)
    return { prettyHtml, formattedName }
  }

  // Генерация MJML (только если поддерживается)
  const generateMJMLCode = async () => {
    if (!processor || !supportsMJML) return null
    const rawHtml = getRawContent()
    if (!rawHtml.trim()) throw new Error('Text editor is empty')

    const formattedName = getFormattedName()
    const prettyMjml = await processor.exportMJML(rawHtml, formattedName)
    setMjmlOutput(prettyMjml)
    return { prettyMjml, formattedName }
  }

  const processImages = async () => {
    if (!editorRef.current) return

    const imgs = Array.from(editorRef.current.querySelectorAll('img'))
    if (!imgs.length) return

    const promoName = getFormattedName()

    if (isS3Enabled) {
      const activeBtnFake = { textContent: activeCategory }
      const fakeLogEl = {
        set innerHTML(val) { setLogText(val) },
        get innerHTML() { return logText },
        set textContent(val) { setLogText(val) },
        get textContent() { return logText }
      }
      await uploadImagesToS3(imgs, activeCategory, promoName, activeBtnFake, fakeLogEl)
    } else {
      let index = 1
      let saved = 0

      for (const img of imgs) {
        const src = img.getAttribute('src')
        if (!src) continue

        const blob = await getBlobFromSrc(src)
        if (!blob) continue

        const { outBlob } = await toJpeg600(blob, '#ffffff')
        const blobWithMeta = await injectMetadata(outBlob, activeCategory)

        saveAs(blobWithMeta, `${promoName}_img-${index}.jpg`)
        index++
        saved++

        setLogText(`${saved}`)
        await new Promise(r => setTimeout(r, 300))
      }

      setLogText(`${saved > 1 ? saved + ' images' : saved + ' image'} saved to PC ✅<br>`)
    }
  }

  // 1. Download HTML (все 3 функции)
  const handleFullDownloadHTML = async () => {
    try {
      const { prettyHtml, formattedName } = await generateHTMLCode()
      const blob = new Blob([prettyHtml], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${formattedName}_html.html`)
      await processImages()
    } catch (err) {
      console.error('Error during full HTML export:', err)
      setLogText(`❌ Error: ${err.message}<br>`)
    }
  }

  // 2. Download MJML
  const exportMJML = async () => {
    try {
      if (!supportsMJML) return
      const { prettyMjml, formattedName } = await generateMJMLCode()
      const blob = new Blob([prettyMjml], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${formattedName}_mjml.html`)
    } catch (err) {
      console.error('Error exporting MJML:', err)
    }
  }

  // 3. Export Code (#exportAll) — для Alpha генерирует только HTML
  const handleExportAll = async () => {
    try {
      await generateHTMLCode()
      if (supportsMJML) {
        await generateMJMLCode()
      }
    } catch (err) {
      console.error('Error exporting code:', err)
    }
  }

  // 4. Download Images (#btn-download)
  const handleDownloadImagesOnly = async () => {
    try {
      await processImages()
    } catch (err) {
      console.error('Error processing images:', err)
      setLogText(`❌ Image Error: ${err.message}<br>`)
    }
  }

  return (
    <div className="main-wrapper">
      <div className="limit">

        {/* ВЕРХНЯЯ ПАНЕЛЬ */}
        <div className="main-input-number-block">

          <div className="input-name-block">
            <button type="button" className="button-number button-decrement" onClick={() => changeNumber(-1)}>
              <svg viewBox="0 0 15 3" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 1.5C0 0.671573 0.671573 0 1.5 0H13.5C14.3284 0 15 0.671573 15 1.5C15 2.32843 14.3284 3 13.5 3H1.5C0.671573 3 0 2.32843 0 1.5Z" />
              </svg>
            </button>

            <div className="field">
              <div className="field__line"></div>
              <input
                className="field__area input-name"
                id="fileName"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder=""
                autoComplete="off"
              />
            </div>

            <button type="button" className="button-number button-increment" onClick={() => changeNumber(1)}>
              <svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 7.5C0 6.67157 0.671573 6 1.5 6H13.5C14.3284 6 15 6.67157 15 7.5C15 8.32843 14.3284 9 13.5 9H1.5C0.671573 9 0 8.32843 0 7.5Z" />
                <path d="M7.5 15C6.67157 15 6 14.3284 6 13.5L6 1.5C6 0.671573 6.67157 0 7.5 0V0C8.32843 0 9 0.671573 9 1.5V13.5C9 14.3284 8.32843 15 7.5 15V15Z" />
              </svg>
            </button>
          </div>

          <div className="category-wrap _show">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`main-btn main-btn_noicon category-wrap__link ${activeCategory === cat.toLowerCase() ? '_active' : ''
                  }`}
                onClick={() => onCategoryChange(cat.toLowerCase())}>
                <span>{cat}</span>
              </button>
            ))}
          </div>

        </div>

        {/* ОСНОВНОЙ БЛОК */}
        <div className="flex-cols flex-cols_cat">

          <div className="flex-col">
            <div className="primary-text-editor-wrapper">
              <div className="primary-text-editor-bg field-big">
                <div className="field-big__line"></div>
                <div
                  ref={editorRef}
                  id="editor"
                  className="field-big__area field-big__area_main primary-text-editor-block"
                  contentEditable="true"
                  onInput={handleEditorInput}
                  suppressContentEditableWarning={true}
                />
              </div>
            </div>
          </div>

          <div className="flex-col">
            <div className="code-blocks-wrapper">

              <div className="code-block">
                <div className="code-buttons-wrapper">

                  {/* Кнопка Download HTML */}
                  <button type="button" id="downloadBtn" className="main-btn primary-button" title="Download HTML" onClick={handleFullDownloadHTML}>
                    <span>
                      Download
                      <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.94 15.86V22.898C4.9496 23.4582 5.40158 23.9103 5.9614 23.9198L5.9795 23.92H16.2538L20.54 19.6338V15.86H22.1V20.28L16.9 25.48H5.9795C4.55803 25.48 3.4033 24.3391 3.38035 22.923L3.38 22.88V15.86H4.94ZM20.228 18.72L15.548 23.4V18.72H20.228ZM19.5005 0C20.922 0 22.0767 1.14087 22.0997 2.55695L22.1 2.59995V3.38H22.88C24.3159 3.38 25.48 4.54406 25.48 5.98V11.7C25.48 13.1359 24.3159 14.3 22.88 14.3H2.6C1.16406 14.3 0 13.1359 0 11.7V5.98C0 4.54406 1.16406 3.38 2.6 3.38H3.38V2.59995C3.38 1.17876 4.52067 0.0233153 5.93651 0.000348427L5.9795 0H19.5005ZM22.88 4.94H2.6C2.03161 4.94 1.56971 5.39597 1.56 5.96209V11.7C1.56 12.2684 2.01597 12.7303 2.58209 12.7398L2.6 12.74H22.88C23.4484 12.74 23.9103 12.284 23.92 11.7179V5.98C23.92 5.41161 23.464 4.94971 22.8979 4.94015L22.88 4.94ZM4.1236 5.98V8.0236H6.5806V5.98H7.696V11.1826H6.5806V8.9986H4.1236V11.1826H3.016V5.98H4.1236ZM12.2876 5.98V6.955H10.7744V11.1826H9.659V6.955H8.138V5.98H12.2876ZM14.2896 5.98L15.5532 9.2248L16.8168 5.98H18.3768V11.1826H17.2614V7.4386L15.795 11.1826H15.3114L13.845 7.4386V11.1826H12.7374V5.98H14.2896ZM20.254 5.98V10.2076H22.4536V11.1826H19.1464V5.98H20.254ZM19.5005 1.56H5.9616C5.40199 1.56961 4.94971 2.02195 4.94 2.58185V2.59995V3.38H20.54V2.58203C20.5303 2.01582 20.0686 1.56 19.5005 1.56Z" />
                      </svg>
                    </span>
                  </button>

                  {/* Кнопка Download MJML — скрывается, если у процессора supportsMJML === false */}
                  {supportsMJML && (
                    <button type="button" id="mjmlDownloadBtn" className="main-btn primary-button" title="Download MJML" onClick={exportMJML}>
                      <span>
                        Download
                        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.20001 16.12V23.158C5.20961 23.7182 5.66159 24.1703 6.22141 24.1799L6.23951 24.18H16.5138L20.8 19.8938V16.12H22.36V20.54L17.16 25.74H6.23951C4.81804 25.74 3.66331 24.5991 3.64036 23.1831L3.64001 23.1401V16.12H5.20001ZM20.488 18.98L15.808 23.66V18.98H20.488ZM19.7605 0.26001C21.182 0.26001 22.3367 1.40088 22.3597 2.81696L22.36 2.85996V3.64001H23.14C24.5759 3.64001 25.74 4.80407 25.74 6.24001V11.96C25.74 13.3959 24.5759 14.56 23.14 14.56H2.86001C1.42407 14.56 0.26001 13.3959 0.26001 11.96V6.24001C0.26001 4.80407 1.42407 3.64001 2.86001 3.64001H3.64001V2.85996C3.64001 1.43877 4.78068 0.283325 6.19652 0.260358L6.23951 0.26001H19.7605ZM23.14 5.20001H2.86001C2.29162 5.20001 1.82972 5.65598 1.82001 6.2221V11.96C1.82001 12.5284 2.27598 12.9903 2.8421 12.9999L2.86001 13H23.14C23.7084 13 24.1703 12.544 24.18 11.9779V6.24001C24.18 5.67162 23.724 5.20972 23.1579 5.20016L23.14 5.20001ZM19.7605 1.82001H6.22161C5.662 1.82962 5.20972 2.28196 5.20001 2.84186V3.64001H20.8V2.84204C20.7903 2.27583 20.3287 1.82001 19.7605 1.82001Z" />
                          <path d="M3.09247 6.30912H4.41989L5.82188 9.72957H5.88153L7.28352 6.30912H8.61094V11.4H7.5669V8.08646H7.52465L6.20717 11.3752H5.49624L4.17876 8.07403H4.13651V11.4H3.09247V6.30912Z" />
                          <path d="M11.5361 6.30912H12.6V9.85883C12.6 10.187 12.5263 10.472 12.3788 10.7139C12.2329 10.9559 12.0299 11.1423 11.7698 11.2732C11.5096 11.4042 11.2071 11.4696 10.8624 11.4696C10.5559 11.4696 10.2775 11.4158 10.0272 11.3081C9.77864 11.1987 9.58143 11.033 9.4356 10.8109C9.28977 10.5872 9.21768 10.3063 9.21934 9.96821H10.2907C10.294 10.1024 10.3214 10.2176 10.3727 10.3137C10.4258 10.4082 10.4979 10.4811 10.589 10.5325C10.6818 10.5822 10.7912 10.6071 10.9171 10.6071C11.0497 10.6071 11.1616 10.5789 11.2527 10.5225C11.3455 10.4645 11.416 10.38 11.464 10.269C11.5121 10.158 11.5361 10.0212 11.5361 9.85883V6.30912Z" />
                          <path d="M13.4899 6.30912H14.8173L16.2193 9.72957H16.279L17.681 6.30912H19.0084V11.4H17.9644V8.08646H17.9221L16.6046 11.3752H15.8937L14.5762 8.07403H14.534V11.4H13.4899V6.30912Z" />
                          <path d="M19.8952 11.4V6.30912H20.9716V10.5126H23.1541V11.4H19.8952Z" />
                        </svg>
                      </span>
                    </button>
                  )}

                  {/* Кнопка Download Images */}
                  <button type="button" id="btn-download" className="main-btn main-btn_marg main-btn_icon primary-button" title="Download images" onClick={handleDownloadImagesOnly}>
                    <span>
                      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 24H3C2.20435 24 1.44129 23.6839 0.87868 23.1213C0.316071 22.5587 0 21.7956 0 21V5C0 4.20435 0.316071 3.44129 0.87868 2.87868C1.44129 2.31607 2.20435 2 3 2H23C23.7956 2 24.5587 2.31607 25.1213 2.87868C25.6839 3.44129 26 4.20435 26 5V21C26 21.7956 25.6839 22.5587 25.1213 23.1213C24.5587 23.6839 23.7956 24 23 24ZM3 4C2.73478 4 2.48043 4.10536 2.29289 4.29289C2.10536 4.48043 2 4.73478 2 5V21C2 21.2652 2.10536 21.5196 2.29289 21.7071C2.48043 21.8946 2.73478 22 3 22H23C23.2652 22 23.5196 21.8946 23.7071 21.7071C23.8946 21.5196 24 21.2652 24 21V5C24 4.73478 23.8946 4.48043 23.7071 4.29289C23.5196 4.10536 23.2652 4 23 4H3Z" />
                        <path d="M18 12C17.4067 12 16.8266 11.8241 16.3333 11.4944C15.8399 11.1648 15.4554 10.6962 15.2284 10.1481C15.0013 9.59987 14.9419 8.99667 15.0576 8.41473C15.1734 7.83279 15.4591 7.29824 15.8787 6.87868C16.2982 6.45912 16.8328 6.1734 17.4147 6.05765C17.9967 5.94189 18.5999 6.0013 19.1481 6.22836C19.6962 6.45543 20.1648 6.83994 20.4944 7.33329C20.8241 7.82664 21 8.40666 21 9C21 9.79565 20.6839 10.5587 20.1213 11.1213C19.5587 11.6839 18.7957 12 18 12ZM18 8C17.8022 8 17.6089 8.05865 17.4444 8.16853C17.28 8.27841 17.1518 8.43459 17.0761 8.61732C17.0004 8.80004 16.9806 9.00111 17.0192 9.19509C17.0578 9.38907 17.153 9.56726 17.2929 9.70711C17.4327 9.84696 17.6109 9.9422 17.8049 9.98079C17.9989 10.0194 18.2 9.99957 18.3827 9.92388C18.5654 9.84819 18.7216 9.72002 18.8315 9.55557C18.9414 9.39112 19 9.19778 19 9C19 8.73479 18.8946 8.48043 18.7071 8.2929C18.5196 8.10536 18.2652 8 18 8Z" />
                        <path d="M23 24C22.8353 23.9991 22.6734 23.9576 22.5286 23.8791C22.3838 23.8006 22.2606 23.6875 22.17 23.55L17.83 17.05C17.7386 16.9138 17.615 16.8023 17.4703 16.7252C17.3255 16.6481 17.164 16.6077 17 16.6077C16.836 16.6077 16.6746 16.6481 16.5298 16.7252C16.3851 16.8023 16.2615 16.9138 16.17 17.05L15.83 17.55C15.6737 17.744 15.4506 17.8727 15.2044 17.9109C14.9582 17.949 14.7066 17.8939 14.4989 17.7562C14.2912 17.6186 14.1424 17.4084 14.0815 17.1668C14.0207 16.9251 14.0523 16.6695 14.17 16.45L14.5 15.94C14.7737 15.5274 15.1452 15.189 15.5814 14.9549C16.0176 14.7208 16.505 14.5983 17 14.5983C17.4951 14.5983 17.9825 14.7208 18.4187 14.9549C18.8549 15.189 19.2264 15.5274 19.5 15.94L23.83 22.45C23.9748 22.6704 24.0266 22.9391 23.9741 23.1976C23.9217 23.4561 23.7693 23.6833 23.55 23.83C23.389 23.9427 23.1966 24.0022 23 24Z" />
                        <path d="M3.00002 24C2.80841 23.9995 2.62098 23.9439 2.46002 23.84C2.23754 23.6965 2.08102 23.4707 2.02478 23.212C1.96854 22.9533 2.01718 22.6829 2.16002 22.46L8.39002 12.84C8.6604 12.4222 9.03047 12.0782 9.4669 11.839C9.90332 11.5999 10.3924 11.4731 10.89 11.47C11.3849 11.4698 11.8722 11.592 12.3084 11.8258C12.7446 12.0596 13.1162 12.3977 13.39 12.81L19.81 22.45C19.9278 22.6695 19.9594 22.9252 19.8985 23.1668C19.8377 23.4084 19.6889 23.6186 19.4812 23.7563C19.2735 23.8939 19.0219 23.949 18.7757 23.9109C18.5294 23.8727 18.3063 23.744 18.15 23.55L11.72 13.92C11.6294 13.7824 11.5063 13.6694 11.3615 13.5909C11.2167 13.5123 11.0547 13.4708 10.89 13.47C10.7244 13.4719 10.5619 13.515 10.417 13.5952C10.2721 13.6755 10.1495 13.7906 10.06 13.93L3.84002 23.54C3.74967 23.6808 3.62543 23.7967 3.47867 23.8771C3.33192 23.9574 3.16734 23.9997 3.00002 24Z" />
                      </svg>
                    </span>
                  </button>

                  {/* Кнопка Export code (#exportAll) */}
                  <button type="button" id="exportAll" className="main-btn main-btn_icon primary-button" title="Export code" onClick={handleExportAll}>
                    <span>
                      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.6826 4.19116H11.5078C12.6469 4.85959 13.6286 5.75735 14.3979 6.82032H22.6826C23.0617 6.82032 23.3708 7.1292 23.3708 7.50835V20.0816C23.3708 20.4609 23.0618 20.7698 22.6826 20.7698H10.1093C9.73013 20.7698 9.4212 20.4609 9.4212 20.0816V11.7045C9.10369 11.5412 8.77163 11.4035 8.42841 11.2972C8.22727 11.917 7.79069 12.445 7.18995 12.7608C7.06404 12.8267 6.92723 12.8669 6.79199 12.9106V20.0817C6.79199 21.9106 8.28027 23.3991 10.1093 23.3991H22.6826C24.5116 23.3991 25.9999 21.9106 25.9999 20.0817V7.50835C25.9999 5.67944 24.5117 4.19116 22.6826 4.19116Z" />
                        <path d="M6.79796 9.27152C9.50683 9.33653 11.8759 10.7615 13.2384 12.8995C13.3633 13.0947 13.5773 13.2076 13.7998 13.2076C13.8605 13.2076 13.9221 13.199 13.9821 13.182C14.2654 13.1006 14.4622 12.8439 14.4657 12.5495C14.4657 12.5229 14.4657 12.4963 14.4657 12.4699C14.4657 8.19486 11.0491 4.72441 6.79896 4.62253V3.37986C6.79896 3.09053 6.63891 2.82606 6.38388 2.69088C6.27009 2.63088 6.14507 2.60095 6.02095 2.60095C5.86607 2.60095 5.71287 2.64731 5.58106 2.73708L0.302981 6.34961C0.113904 6.47889 0.000953601 6.69283 5.32083e-06 6.92216C-0.000890277 7.1507 0.111323 7.36564 0.299609 7.4965L5.57679 11.1553C5.70944 11.2477 5.86438 11.2939 6.02006 11.2939C6.14412 11.2939 6.26745 11.2648 6.3813 11.2056C6.63707 11.0714 6.79796 10.8053 6.79796 10.5159V9.27152Z" />
                      </svg>
                    </span>
                  </button>

                </div>

                <div className="code-inner-block">
                  <h2 className="sm-main-headline">HTML result:</h2>
                  <div className="field-big">
                    <div className="field-big__line"></div>
                    <textarea
                      id="output"
                      className="field-big__area html-code-block"
                      value={htmlOutput}
                      readOnly
                    />
                  </div>
                </div>

              </div>

              {/* Блок MJML — убирается целиком, если supportsMJML === false */}
              {supportsMJML && (
                <div className="code-block">
                  <div className="code-inner-block">
                    <h2 className="sm-main-headline">MJML result:</h2>
                    <div className="field-big">
                      <div className="field-big__line"></div>
                      <textarea
                        id="mjmlOutput"
                        className="field-big__area html-code-block"
                        value={mjmlOutput}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* LOG БЛОК */}
        <div className="log-wrapper">
          <div className="field-big">
            <div className="field-big__line"></div>
            <div
              id="log"
              className="field-big__area log"
              dangerouslySetInnerHTML={{ __html: logText }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}