import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveAs } from 'file-saver'
import { toast } from 'react-toastify'

import { uploadImagesToS3 } from '../utils/s3Uploader'
import { getBlobFromSrc, toJpeg600, injectMetadata } from '../utils/imageProcessor'
import { generateAltTextsForImages } from '../utils/imageAnalyzer'

const STORAGE_KEY_CATEGORY = 'selectedCategory'

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
  const [hasImages, setHasImages] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const editorRef = useRef(null)
  const htmlOutputRef = useRef(null)
  const mjmlOutputRef = useRef(null)

  const isAnalyzingRef = useRef(false)
  const observerRef = useRef(null)
  const s3ToastIdRef = useRef(null)

  const isSyncingScroll = useRef(false)
  const isFirstRender = useRef(true)
  const supportsMJML = processor?.hasMJML !== false

  const dismissS3ToastIfExist = () => {
    if (s3ToastIdRef.current) {
      toast.dismiss(s3ToastIdRef.current)
      s3ToastIdRef.current = null
    }
  }

  const handleSyncScroll = (sourceRef) => {
    if (isSyncingScroll.current || !sourceRef.current) return

    isSyncingScroll.current = true

    const source = sourceRef.current
    const maxScroll = source.scrollHeight - source.clientHeight

    if (maxScroll <= 0) {
      isSyncingScroll.current = false
      return
    }

    const scrollPercentage = source.scrollTop / maxScroll
    const targets = [editorRef, htmlOutputRef, mjmlOutputRef]

    targets.forEach((targetRef) => {
      if (targetRef && targetRef.current && targetRef !== sourceRef) {
        const target = targetRef.current
        const targetMaxScroll = target.scrollHeight - target.clientHeight
        if (targetMaxScroll > 0) {
          target.scrollTop = scrollPercentage * targetMaxScroll
        }
      }
    })

    requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  useEffect(() => {
    const savedCategory = localStorage.getItem(STORAGE_KEY_CATEGORY)
    if (savedCategory && savedCategory !== activeCategory) {
      if (availableCategories.map(c => c.toLowerCase()).includes(savedCategory)) {
        onCategoryChange(savedCategory)
      }
    }
  }, [])

  useEffect(() => {
    if (activeCategory) {
      localStorage.setItem(STORAGE_KEY_CATEGORY, activeCategory.toLowerCase())
    }
    if (processor) {
      processor.categoryName = activeCategory
    }
  }, [activeCategory, processor])

  const handleCategoryClick = (cat) => {
    const lowerCat = cat.toLowerCase()

    if (lowerCat === activeCategory?.toLowerCase()) return

    dismissS3ToastIfExist()

    localStorage.setItem(STORAGE_KEY_CATEGORY, lowerCat)
    onCategoryChange(lowerCat)

    const formattedName = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
    toast.info(
      <span>
        Category changed to <strong>{formattedName}</strong>
      </span>,
      {
        autoClose: 2000,
        hideProgressBar: true,
        closeButton: false
      }
    )
  }

  const updateImageCountLog = () => {
    if (!editorRef.current) return
    const imgs = editorRef.current.querySelectorAll('img')
    setHasImages(imgs.length > 0)
  }

  useEffect(() => {
    updateImageCountLog()
  }, [])

  const prevS3EnabledRef = useRef(isS3Enabled)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevS3EnabledRef.current = isS3Enabled
      return
    }

    if (prevS3EnabledRef.current !== isS3Enabled) {
      if (isS3Enabled) {
        toast.info('☁️ Auto-upload to S3 mode activated!',
          {
            autoClose: 2000,
            closeButton: false,
            hideProgressBar: true
          })
      } else {
        toast.info('💻 Download to PC mode activated!', {
          autoClose: 2000,
          closeButton: false,
          hideProgressBar: true
        })
      }

      prevS3EnabledRef.current = isS3Enabled
    }
  }, [isS3Enabled])

  const getFormattedName = () => {
    const raw = fileName.trim() || ''
    return raw.replace(/\s+/g, '').toUpperCase()
  }

  const recalculateOutputs = async () => {
    if (!processor) return

    const rawHtml = editorRef.current ? editorRef.current.innerHTML : editorContent

    if (!rawHtml || !rawHtml.trim() || rawHtml === '<br>') {
      setHtmlOutput('')
      setMjmlOutput('')
      return
    }

    const formattedName = getFormattedName()

    try {
      const prettyHtml = await processor.exportHTML(rawHtml, formattedName)
      setHtmlOutput(prettyHtml)

      if (supportsMJML && processor.exportMJML) {
        const prettyMjml = await processor.exportMJML(rawHtml, formattedName)
        setMjmlOutput(prettyMjml)
      } else {
        setMjmlOutput('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    recalculateOutputs()
  }, [editorContent, fileName, activeCategory, processor])

  useEffect(() => {
    if (!editorRef.current) return

    const observer = new MutationObserver(() => {
      if (isAnalyzingRef.current || !editorRef.current) return

      dismissS3ToastIfExist()

      const html = editorRef.current.innerHTML
      setEditorContent(html)
      updateImageCountLog()

      clearTimeout(window.altTimeout)
      window.altTimeout = setTimeout(() => {
        analyzeEditorImages()
      }, 800)
    })

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    })

    observerRef.current = observer

    return () => observer.disconnect()
  }, [])

  const handleEditorInput = (e) => {
    if (isAnalyzingRef.current) return

    dismissS3ToastIfExist()

    const currentHtml = e.currentTarget.innerHTML
    setEditorContent(currentHtml)
    updateImageCountLog()

    clearTimeout(window.altTimeout)
    window.altTimeout = setTimeout(() => {
      analyzeEditorImages()
    }, 800)
  }

  const handleFileNameChange = (e) => {
    dismissS3ToastIfExist() // 🔴 Закрываем поп-ап при изменении названия
    setFileName(e.target.value)
  }

  const changeNumber = (amount) => {
    dismissS3ToastIfExist()

    const match = fileName.match(/(\D*)(\d+)/)
    if (match) {
      const textPart = match[1]
      const numberPart = (parseInt(match[2], 10) || 0) + amount
      setFileName(textPart + numberPart)
    } else if (!fileName) {
      setFileName('')
    }
  }

  const handlePaste = () => {
    setTimeout(() => {
      isSyncingScroll.current = true

      if (editorRef.current) editorRef.current.scrollTop = 0
      if (htmlOutputRef.current) htmlOutputRef.current.scrollTop = 0
      if (mjmlOutputRef.current) mjmlOutputRef.current.scrollTop = 0

      requestAnimationFrame(() => {
        isSyncingScroll.current = false
      })
    }, 10)
  }

  const getRawContent = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() !== '') {
      return editorRef.current.innerHTML
    }
    return editorContent
  }

  const generateHTMLCode = async () => {
    if (!processor) throw new Error('No processor attached')
    const rawHtml = getRawContent()
    if (!rawHtml.trim()) throw new Error('Text editor is empty')

    const formattedName = getFormattedName()
    const prettyHtml = await processor.exportHTML(rawHtml, formattedName)
    setHtmlOutput(prettyHtml)
    return { prettyHtml, formattedName }
  }

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

    const formattedCategory = activeCategory
      ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).toLowerCase()
      : 'Finance'

    if (isS3Enabled) {
      dismissS3ToastIfExist()

      const toastId = toast.loading('🚀 Initializing S3 Upload...')
      s3ToastIdRef.current = toastId

      await uploadImagesToS3(
        imgs,
        formattedCategory,
        promoName,
        activeCategory,
        toastId
      )
    } else {
      let index = 1
      let saved = 0

      for (const img of imgs) {
        const src = img.getAttribute('src')
        if (!src) continue

        const blob = await getBlobFromSrc(src)
        if (!blob) continue

        const { outBlob } = await toJpeg600(blob, '#ffffff')
        const blobWithMeta = await injectMetadata(outBlob, formattedCategory)

        saveAs(blobWithMeta, `${promoName}_img-${index}.jpg`)
        index++
        saved++

        await new Promise(r => setTimeout(r, 200))
      }

      toast.success(`💾 ${saved > 1 ? saved + ' images' : saved + ' image'} saved to PC!`, { autoClose: 3000 })
    }
  }

  const handleFullDownloadHTML = async () => {
    try {
      const { prettyHtml, formattedName } = await generateHTMLCode()
      const blob = new Blob([prettyHtml], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${formattedName}_html.html`)
      toast.success('📄 HTML file downloaded!', { autoClose: 3000 })

      await processImages()
    } catch (err) {
      console.error('Error during HTML export:', err)
      toast.error(`❌ Download HTML Error: ${err.message}`)
    }
  }

  const exportMJML = async () => {
    try {
      if (!supportsMJML) return
      const { prettyMjml, formattedName } = await generateMJMLCode()
      const blob = new Blob([prettyMjml], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${formattedName}_mjml.html`)
      toast.success('📧 MJML file downloaded!', { autoClose: 3000 })
    } catch (err) {
      console.error('Error exporting MJML:', err)
      toast.error(`❌ MJML Error: ${err.message}`)
    }
  }

  const handleDownloadAll = async () => {
    try {
      const { prettyHtml, formattedName } = await generateHTMLCode()
      const htmlBlob = new Blob([prettyHtml], { type: 'text/html;charset=utf-8' })
      saveAs(htmlBlob, `${formattedName}_html.html`)

      if (supportsMJML) {
        const { prettyMjml } = await generateMJMLCode()
        if (prettyMjml) {
          const mjmlBlob = new Blob([prettyMjml], { type: 'text/html;charset=utf-8' })
          saveAs(mjmlBlob, `${formattedName}_mjml.html`)
        }
      }

      toast.success('📦 HTML & MJML downloaded successfully!', { autoClose: 3000 })

      await processImages()
    } catch (err) {
      console.error('Error downloading all items:', err)
      toast.error(`❌ Download ALL Error: ${err.message}`)
    }
  }

  const handleDownloadImagesOnly = async () => {
    try {
      await processImages()
    } catch (err) {
      console.error('Error processing images:', err)
      toast.error(`❌ Image Download Error: ${err.message}`)
    }
  }

  const analyzeEditorImages = async () => {
    if (!editorRef.current || isAnalyzingRef.current) return

    const imgs = Array.from(editorRef.current.querySelectorAll('img'))
      .filter(img => img.getAttribute('data-ai-analyzed') !== 'true')

    if (imgs.length === 0) return

    isAnalyzingRef.current = true
    setIsAnalyzing(true)

    const aiToastId = toast.loading(`🤖 AI starts analyzing ${imgs.length} image${imgs.length > 1 ? 's' : ''}...`)

    try {
      await generateAltTextsForImages(imgs, aiToastId)

      if (editorRef.current) {
        setEditorContent(editorRef.current.innerHTML)
      }
    } catch (err) {
      console.error('AI Alt Generation failed:', err)
      toast.update(aiToastId, {
        render: `⚠️ AI Error: ${err.message}`,
        type: 'error',
        isLoading: false,
        autoClose: 4000
      })
    } finally {
      isAnalyzingRef.current = false
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="limit-main">
      <div className="limit">

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
                onChange={handleFileNameChange}
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

          <AnimatePresence initial={false}>
            {hasImages && availableCategories && availableCategories.length > 1 && (
              <motion.div
                key="categories-wrap"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="category-wrap _show"
              >
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`main-btn main-btn_noicon category-wrap__link ${activeCategory === cat.toLowerCase() ? '_active' : ''
                      }`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <span>{cat}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <div className="flex-cols flex-cols_cat">

          <div className="flex-col">
            <div className="primary-text-editor-wrapper">
              <div className="primary-text-editor-bg field-big" style={{ borderRadius: '16px' }}>
                <div className="field-big__line"></div>
                <div
                  ref={editorRef}
                  id="editor"
                  className="field-big__area field-big__area_main primary-text-editor-block"
                  contentEditable="true"
                  onPaste={handlePaste}
                  onInput={handleEditorInput}
                  onScroll={() => handleSyncScroll(editorRef)}
                  suppressContentEditableWarning={true}
                />
              </div>
            </div>
          </div>

          <div className="flex-col">
            <div className="code-blocks-wrapper">

              <div className="code-buttons-wrapper">

                {['finance', 'health', 'pets'].includes(activeCategory?.toLowerCase()) ? (
                  <button
                    disabled={isAnalyzing}
                    type="button"
                    id="downloadAllBtn"
                    className="main-btn primary-button"
                    title="Download HTML, MJML & Images"
                    onClick={handleDownloadAll}
                    style={{
                      opacity: isAnalyzing ? 0.6 : 1,
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span>
                      {isAnalyzing ? 'Analyzing...' : 'Download'}
                      <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.94 15.86V22.898C4.9496 23.4582 5.40158 23.9103 5.9614 23.9198L5.9795 23.92H16.2538L20.54 19.6338V15.86H22.1V20.28L16.9 25.48H5.9795C4.55803 25.48 3.4033 24.3391 3.38035 22.923L3.38 22.88V15.86H4.94ZM20.228 18.72L15.548 23.4V18.72H20.228ZM19.5005 0C20.922 0 22.0767 1.14087 22.0997 2.55695L22.1 2.59995V3.38H22.88C24.3159 3.38 25.48 4.54406 25.48 5.98V11.7C25.48 13.1359 24.3159 14.3 22.88 14.3H2.6C1.16406 14.3 0 13.1359 0 11.7V5.98C0 4.54406 1.16406 3.38 2.6 3.38H3.38V2.59995C3.38 1.17876 4.52067 0.0233153 5.93651 0.000348427L5.9795 0H19.5005ZM22.88 4.94H2.6C2.03161 4.94 1.56971 5.39597 1.56 5.96209V11.7C1.56 12.2684 2.01597 12.7303 2.58209 12.7398L2.6 12.74H22.88C23.4484 23.74 23.9103 12.284 23.92 11.7179V5.98C23.92 5.41161 23.464 4.94971 22.8979 4.94015L22.88 4.94ZM19.5005 1.56H5.9616C5.40199 1.56961 4.94971 2.02195 4.94 2.58185V2.59995V3.38H20.54V2.58203C20.5303 2.01582 20.0686 1.56 19.5005 1.56Z" />
                        <path d="M7.7 5.98H9.1L11.05 11.18H9.85L9.4 9.9H7.4L6.95 11.18H5.75L7.7 5.98ZM7.8 8.85H9.00L8.4 7.15L7.8 8.85Z" />
                        <path d="M12.6 5.98V10.15H14.8V11.18H11.4V5.98H12.6Z" />
                        <path d="M16.4 5.98V10.15H18.6V11.18H15.2V5.98H16.4Z" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  /* 2. Кнопка "Download HTML" — отображается ДЛЯ ВСЕХ ОСТАЛЬНЫХ категорий */
                  <button
                    disabled={isAnalyzing}
                    type="button"
                    id="downloadBtn"
                    className="main-btn primary-button"
                    title="Download HTML"
                    onClick={handleFullDownloadHTML}
                    style={{
                      opacity: isAnalyzing ? 0.6 : 1,
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span>
                      {isAnalyzing ? 'Analyzing...' : 'Download'}
                      <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.94 15.86V22.898C4.9496 23.4582 5.40158 23.9103 5.9614 23.9198L5.9795 23.92H16.2538L20.54 19.6338V15.86H22.1V20.28L16.9 25.48H5.9795C4.55803 25.48 3.4033 24.3391 3.38035 22.923L3.38 22.88V15.86H4.94ZM20.228 18.72L15.548 23.4V18.72H20.228ZM19.5005 0C20.922 0 22.0767 1.14087 22.0997 2.55695L22.1 2.59995V3.38H22.88C24.3159 3.38 25.48 4.54406 25.48 5.98V11.7C25.48 13.1359 24.3159 14.3 22.88 14.3H2.6C1.16406 14.3 0 13.1359 0 11.7V5.98C0 4.54406 1.16406 3.38 2.6 3.38H3.38V2.59995C3.38 1.17876 4.52067 0.0233153 5.93651 0.000348427L5.9795 0H19.5005ZM22.88 4.94H2.6C2.03161 4.94 1.56971 5.39597 1.56 5.96209V11.7C1.56 12.2684 2.01597 12.7303 2.58209 12.7398L2.6 12.74H22.88C23.4484 23.74 23.9103 12.284 23.92 11.7179V5.98C23.92 5.41161 23.464 4.94971 22.8979 4.94015L22.88 4.94ZM4.1236 5.98V8.0236H6.5806V5.98H7.696V11.1826H6.5806V8.9986H4.1236V11.1826H3.016V5.98H4.1236ZM12.2876 5.98V6.955H10.7744V11.1826H9.659V6.955H8.138V5.98H12.2876ZM14.2896 5.98L15.5532 9.2248L16.8168 5.98H18.3768V11.1826H17.2614V7.4386L15.795 11.1826H15.3114L13.845 7.4386V11.1826H12.7374V5.98H14.2896ZM20.254 5.98V10.2076H22.4536V11.1826H19.1464V5.98H20.254ZM19.5005 1.56H5.9616C5.40199 1.56961 4.94971 2.02195 4.94 2.58185V2.59995V3.38H20.54V2.58203C20.5303 2.01582 20.0686 1.56 19.5005 1.56Z" />
                      </svg>
                    </span>
                  </button>
                )}

                {/* <AnimatePresence initial={false}>
                  {supportsMJML && (
                    <motion.button
                      key="mjml-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isAnalyzing ? 0.5 : 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      type="button"
                      id="mjmlDownloadBtn"
                      className="main-btn primary-button"
                      title="Download MJML"
                      onClick={exportMJML}
                      disabled={isAnalyzing}
                      style={{
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>
                        {isAnalyzing ? 'Analyzing...' : 'Download'}
                        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.20001 16.12V23.158C5.20961 23.7182 5.66159 24.1703 6.22141 24.1799L6.23951 24.18H16.5138L20.8 19.8938V16.12H22.36V20.54L17.16 25.74H6.23951C4.81804 25.74 3.66331 24.5991 3.64036 23.1831L3.64001 23.1401V16.12H5.20001ZM20.488 18.98L15.808 23.66V18.98H20.488ZM19.7605 0.26001C21.182 0.26001 22.3367 1.40088 22.3597 2.81696L22.36 2.85996V3.64001H23.14C24.5759 3.64001 25.74 4.80407 25.74 6.24001V11.96C25.74 13.3959 24.5759 14.56 23.14 14.56H2.86001C1.42407 14.56 0.26001 13.3959 0.26001 11.96V6.24001C0.26001 4.80407 1.42407 3.64001 2.86001 3.64001H3.64001V2.85996C3.64001 1.43877 4.78068 0.283325 6.19652 0.260358L6.23951 0.26001H19.7605ZM23.14 5.20001H2.86001C2.29162 5.20001 1.82972 5.65598 1.82001 6.2221V11.96C1.82001 12.5284 2.27598 12.9903 2.8421 12.9999L2.86001 13H23.14C23.7084 13 24.1703 12.544 24.18 11.9779V6.24001C24.18 5.67162 23.724 5.20972 23.1579 5.20016L23.14 5.20001ZM19.7605 1.82001H6.22161C5.662 1.82962 5.20972 2.28196 5.20001 2.84186V3.64001H20.8V2.84204C20.7903 2.27583 20.3287 1.82001 19.7605 1.82001Z" />
                          <path d="M3.09247 6.30912H4.41989L5.82188 9.72957H5.88153L7.28352 6.30912H8.61094V11.4H7.5669V8.08646H7.52465L6.20717 11.3752H5.49624L4.17876 8.07403H4.13651V11.4H3.09247V6.30912Z" />
                          <path d="M11.5361 6.30912H12.6V9.85883C12.6 10.187 12.5263 10.472 12.3788 10.7139C12.2329 10.9559 12.0299 11.1423 11.7698 11.2732C11.5096 11.4042 11.2071 11.4696 10.8624 11.4696C10.5559 11.4696 10.2775 11.4158 10.0272 11.3081C9.77864 11.1987 9.58143 11.033 9.4356 10.8109C9.28977 10.5872 9.21768 10.3063 9.21934 9.96821H10.2907C10.294 10.1024 10.3214 10.2176 10.3727 10.3137C10.4258 10.4082 10.4979 10.4811 10.589 10.5325C10.6818 10.5822 10.7912 10.6071 10.9171 10.6071C11.0497 10.6071 11.1616 10.5789 11.2527 10.5225C11.3455 10.4645 11.416 10.38 11.464 10.269C11.5121 10.158 11.5361 10.0212 11.5361 9.85883V6.30912Z" />
                          <path d="M13.4899 6.30912H14.8173L16.2193 9.72957H16.279L17.681 6.30912H19.0084V11.4H17.9644V8.08646H17.9221L16.6046 11.3752H15.8937L14.5762 8.07403H14.534V11.4H13.4899V6.30912Z" />
                          <path d="M19.8952 11.4V6.30912H20.9716V10.5126H23.1541V11.4H19.8952Z" />
                        </svg>
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence> */}

                <button
                  type="button"
                  id="btn-download"
                  className="main-btn main-btn_marg main-btn_icon primary-button"
                  title="Download images"
                  onClick={handleDownloadImagesOnly}
                  disabled={isAnalyzing}
                  style={{
                    display: hasImages ? 'flex' : 'none',
                    opacity: isAnalyzing ? 0.6 : 1,
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23 24H3C2.20435 24 1.44129 23.6839 0.87868 23.1213C0.316071 22.5587 0 21.7956 0 21V5C0 4.20435 0.316071 3.44129 0.87868 2.87868C1.44129 2.31607 2.20435 2 3 2H23C23.7956 2 24.5587 2.31607 25.1213 2.87868C25.6839 3.44129 26 4.20435 26 5V21C26 21.7956 25.6839 22.5587 25.1213 23.1213C24.5587 23.6839 23.7956 24 23 24ZM3 4C2.73478 4 2.48043 4.10536 2.29289 4.29289C2.10536 4.48043 2 4.73478 2 5V21C2 21.2652 2.10536 21.5196 2.29289 21.7071C2.48043 21.8946 2.73478 22 3 22H23C23.2652 22 23.5196 21.8946 23.7071 21.7071C23.8946 21.5196 24 21.2652 24 21V5C24 4.73478 23.8946 4.48043 23.7071 4.29289C23.5196 4.10536 23.2652 4 23 4H3Z" />
                      <path d="M18 12C17.4067 12 16.8266 11.8241 16.3333 11.4944C15.8399 11.1648 15.4554 10.6962 15.2284 10.1481C15.0013 9.59987 14.9419 8.99667 15.0576 8.41473C15.1734 7.83279 15.4591 7.29824 15.8787 6.87868C16.2982 6.45912 16.8328 6.1734 17.4147 6.05765C17.9967 5.94189 18.5999 6.0013 19.1481 6.22836C19.6962 6.45543 20.1648 6.83994 20.4944 7.33329C20.8241 7.82664 21 8.40666 21 9C21 9.79565 20.6839 10.5587 20.1213 11.1213C19.5587 11.6839 18.7957 12 18 12ZM18 8C17.8022 8 17.6089 8.05865 17.4444 8.16853C17.28 8.27841 17.1518 8.43459 17.0761 8.61732C17.0004 8.80004 16.9806 9.00111 17.0192 9.19509C17.0578 9.38907 17.153 9.56726 17.2929 9.70711C17.4327 9.84696 17.6109 9.9422 17.8049 9.98079C17.9989 10.0194 18.2 9.99957 18.3827 9.92388C18.5654 9.84819 18.7216 9.72002 18.8315 9.55557C18.9414 9.39112 19 9.19778 19 9C19 8.73479 18.8946 8.48043 18.7071 8.2929C18.5196 8.10536 18.2652 8 18 8Z" />
                      <path d="M23 24C22.8353 23.9991 22.6734 23.9576 22.5286 23.8791C22.3838 23.8006 22.2606 23.6875 22.17 23.55L17.83 17.05C17.7386 16.9138 17.615 16.8023 17.4703 16.7252C17.3255 16.6481 17.164 16.6077 17 16.6077C16.836 16.6077 16.6746 16.6481 16.5298 16.7252C16.3851 16.8023 16.2615 16.9138 16.17 17.05L15.83 17.55C15.6737 17.744 15.4506 17.8727 15.2044 17.9109C14.9582 17.949 14.7066 17.8939 14.4989 17.7562C14.2912 17.6186 14.1424 17.4084 14.0815 17.1668C14.0207 16.9251 14.0523 16.6695 14.17 16.45L14.5 15.94C14.7737 15.5274 15.1452 15.189 15.5814 14.9549C16.0176 14.7208 16.505 14.5983 17 14.5983C17.4951 14.5983 17.9825 14.7208 18.4187 14.9549C18.8549 15.189 19.2264 15.5274 19.5 15.94L23.83 22.45C23.9748 22.6704 24.0266 22.9391 23.9741 23.1976C23.9217 23.4561 23.7693 23.6833 23.55 23.83C23.389 23.9427 23.1966 24.0022 23 24Z" />
                      <path d="M3.00002 24C2.80841 23.9995 2.62098 23.9439 2.46002 23.84C2.23754 23.6965 2.08102 23.4707 2.02478 23.212C1.96854 22.9533 2.01718 22.6829 2.16002 22.46L8.39002 12.84C8.6604 12.4222 9.03047 12.0782 9.4669 11.839C9.90332 11.5999 10.3924 11.4731 10.89 11.47C11.3849 11.4698 11.8722 11.592 12.3084 11.8258C12.7446 12.0596 13.1162 12.3977 13.39 12.81L19.81 22.45C19.9278 22.6695 19.9594 22.9252 19.8985 23.1668C19.8377 23.4084 19.6889 23.6186 19.4812 23.7563C19.2735 23.8939 19.0219 23.949 18.7757 23.9109C18.5294 23.8727 18.3063 23.744 18.15 23.55L11.72 13.92C11.6294 13.7824 11.5063 13.6694 11.3615 13.5909C11.2167 13.5123 11.0547 13.4708 10.89 13.47C10.7244 13.4719 10.5619 13.515 10.417 13.5952C10.2721 13.6755 10.1495 13.7906 10.06 13.93L3.84002 23.54C3.74967 23.6808 3.62543 23.7967 3.47867 23.8771C3.33192 23.9574 3.16734 23.9997 3.00002 24Z" />
                    </svg>
                  </span>
                </button>

              </div>

              <motion.div
                initial={false}
                animate={{
                  gridTemplateRows: supportsMJML ? '1fr 1fr' : '1fr 0fr',
                  gap: supportsMJML ? '20px' : '0px',
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{
                  display: 'grid',
                  flexGrow: 1,
                  minHeight: 0,
                }}
              >
                <div className="code-block" style={{ minHeight: 0 }}>
                  <div className="code-inner-block">
                    <h2 className="sm-main-headline">HTML:</h2>
                    <div className="field-big" style={{ borderRadius: '16px' }}>
                      <div className="field-big__line"></div>
                      <textarea
                        ref={htmlOutputRef}
                        id="output"
                        className="field-big__area html-code-block"
                        value={htmlOutput}
                        onScroll={() => handleSyncScroll(htmlOutputRef)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="code-block" style={{ minHeight: 0 }}>
                  <AnimatePresence initial={false}>
                    {supportsMJML && (
                      <motion.div
                        key="mjml-inner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="code-inner-block"
                        style={{ height: '100%' }}
                      >
                        <h2 className="sm-main-headline">MJML:</h2>
                        <div className="field-big">
                          <div className="field-big__line"></div>
                          <textarea
                            ref={mjmlOutputRef}
                            id="mjmlOutput"
                            className="field-big__area html-code-block"
                            value={mjmlOutput}
                            onScroll={() => handleSyncScroll(mjmlOutputRef)}
                            readOnly
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}