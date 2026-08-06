import React, { useState, useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import { toast } from 'react-toastify'

import { uploadImagesToS3 } from '../utils/s3Uploader'
import { getBlobFromSrc, toJpeg600 } from '../utils/imageProcessor'
import { generateAltTextsForImages } from '../utils/imageAnalyzer'
import { advancedProcessor } from '../processors'

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
  const altTimeoutRef = useRef(null)

  const isSyncingScroll = useRef(false)
  const isFirstRender = useRef(true)

  const fileNameInputRef = useRef(null)

  const [mode, setMode] = useState('basic')
  const activeProcessor = mode === 'advanced' ? advancedProcessor : processor
  const supportsMJML = activeProcessor?.hasMJML !== false

  const activeCategoryRef = useRef(activeCategory)
  activeCategoryRef.current = activeCategory

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
    if (fileNameInputRef.current) {
      fileNameInputRef.current.focus()
    }
  }, [])

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
    if (activeProcessor) {
      if (typeof activeProcessor.setCategory === 'function') {
        activeProcessor.setCategory(activeCategory)
      } else {
        activeProcessor.categoryName = activeCategory
      }
    }
  }, [activeCategory, activeProcessor])

  const handleCategoryClick = (cat) => {
    const lowerCat = cat.toLowerCase()
    if (lowerCat === activeCategory?.toLowerCase()) return

    dismissS3ToastIfExist()
    localStorage.setItem(STORAGE_KEY_CATEGORY, lowerCat)
    onCategoryChange(lowerCat)

    const formattedName = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
    toast.info(
      <span>Category changed to <strong>{formattedName}</strong></span>,
      { autoClose: 2000, hideProgressBar: true, closeButton: false }
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
        toast.info('☁️ Auto-upload to S3', {
          autoClose: 2000, closeButton: false, hideProgressBar: true
        })
      } else {
        toast.info('💻 Download to PC', {
          autoClose: 2000, closeButton: false, hideProgressBar: true
        })
      }
      prevS3EnabledRef.current = isS3Enabled
    }
  }, [isS3Enabled])

  const getFormattedName = (nameToFormat = fileName) => {
    const raw = nameToFormat.trim() || ''
    return raw.replace(/\s+/g, '').toUpperCase()
  }

  const recalculateOutputs = async (overrideFileName = null) => {
    if (!activeProcessor) return

    const rawHtml = editorRef.current ? editorRef.current.innerHTML : editorContent

    if (!rawHtml || !rawHtml.trim() || rawHtml === '<br>') {
      setHtmlOutput('')
      setMjmlOutput('')
      return
    }

    const currentFileName = overrideFileName !== null ? overrideFileName : fileName
    const formattedName = getFormattedName(currentFileName)

    try {
      const prettyHtml = await activeProcessor.exportHTML(rawHtml, formattedName)
      setHtmlOutput(prettyHtml)

      if (supportsMJML && activeProcessor.exportMJML) {
        const prettyMjml = await activeProcessor.exportMJML(rawHtml, formattedName)
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
  }, [editorContent, fileName, activeCategory, activeProcessor])

  useEffect(() => {
    if (!editorRef.current) return

    const observer = new MutationObserver((mutations) => {
      if (isAnalyzingRef.current || !editorRef.current) return

      const hasNodeChanges = mutations.some(m => m.type === 'childList')

      if (hasNodeChanges) {
        updateImageCountLog()

        if (altTimeoutRef.current) clearTimeout(altTimeoutRef.current)
        altTimeoutRef.current = setTimeout(() => {
          analyzeEditorImages()
        }, 1000)
      }
    })

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true
    })

    observerRef.current = observer

    return () => {
      observer.disconnect()
      if (altTimeoutRef.current) clearTimeout(altTimeoutRef.current)
    }
  }, [])

  const handleEditorInput = (e) => {
    if (isAnalyzingRef.current) return

    dismissS3ToastIfExist()

    const currentHtml = e.currentTarget.innerHTML
    setEditorContent(currentHtml)
    updateImageCountLog()

    if (altTimeoutRef.current) clearTimeout(altTimeoutRef.current)
    altTimeoutRef.current = setTimeout(() => {
      analyzeEditorImages()
    }, 1000)
  }

  const handleFileNameChange = (e) => {
    dismissS3ToastIfExist()
    const newName = e.target.value
    setFileName(newName)
    recalculateOutputs(newName)
  }

  const changeNumber = (amount) => {
    dismissS3ToastIfExist()
    const match = fileName.match(/(\D*)(\d+)/)
    let nextName = fileName

    if (match) {
      const textPart = match[1]
      const numberPart = (parseInt(match[2], 10) || 0) + amount
      nextName = textPart + numberPart
    } else if (!fileName) {
      nextName = ''
    }

    setFileName(nextName)
    recalculateOutputs(nextName)
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

  const handleResetAll = () => {
    dismissS3ToastIfExist()
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    setEditorContent('')
    setFileName('')
    setHtmlOutput('')
    setMjmlOutput('')
    setHasImages(false)

    if (fileNameInputRef.current) {
      fileNameInputRef.current.focus()
    }

    toast.info('All fields cleared', {
      autoClose: 2000,
      hideProgressBar: true,
      closeButton: false,
    })
  }

  const getRawContent = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() !== '') {
      return editorRef.current.innerHTML
    }
    return editorContent
  }

  const generateHTMLCode = async () => {
    try {
      if (!activeProcessor) throw new Error('No processor attached')
      const rawHtml = getRawContent()
      if (!rawHtml.trim()) throw new Error('Text editor is empty')

      const formattedName = getFormattedName()
      const prettyHtml = await activeProcessor.exportHTML(rawHtml, formattedName)
      setHtmlOutput(prettyHtml)
      return { prettyHtml, formattedName }
    } catch (error) {
      toast.error(` ${error.message}`, {
        closeButton: false,
        closeOnClick: true,
        autoClose: 2000,
        hideProgressBar: true,
        draggable: true
      })
      return null
    }
  }

  const generateMJMLCode = async () => {
    try {
      if (!activeProcessor || !supportsMJML) return null
      const rawHtml = getRawContent()
      if (!rawHtml.trim()) throw new Error('Text editor is empty')

      const formattedName = getFormattedName()
      const prettyMjml = await activeProcessor.exportMJML(rawHtml, formattedName)
      setMjmlOutput(prettyMjml)
      return { prettyMjml, formattedName }
    } catch (error) {
      toast.error(` ${error.message}`, {
        closeButton: true,
        closeOnClick: true,
        autoClose: 4000,
        draggable: true
      })
      return null
    }
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
      return
    }

    let index = 1
    let saved = 0

    for (const img of imgs) {
      const src = img.getAttribute('src')
      if (!src) continue

      const blob = await getBlobFromSrc(src)
      if (!blob) continue

      const { outBlob } = await toJpeg600(blob, '#ffffff')

      saveAs(outBlob, `${promoName}_img-${index}.jpg`)
      index++
      saved++
      await new Promise(r => setTimeout(r, 150))
    }

    toast.success(`💾 ${saved > 1 ? saved + ' images' : saved + ' image'} saved to PC!`, { autoClose: 3000 })
  }

  const handleFullDownloadHTML = async () => {
    try {
      const htmlResult = await generateHTMLCode()
      if (!htmlResult) return

      const { prettyHtml, formattedName } = htmlResult
      const blob = new Blob([prettyHtml], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${formattedName}_html.html`)
      toast.success(<span><strong>{formattedName}</strong> downloaded</span>, { autoClose: 3000 })

      await processImages()
    } catch (err) {
      console.error('Error during HTML export:', err)
    }
  }

  const handleDownloadAll = async () => {
    try {
      const htmlResult = await generateHTMLCode()
      if (!htmlResult) return

      const { prettyHtml, formattedName } = htmlResult
      const htmlBlob = new Blob([prettyHtml], { type: 'text/html;charset=utf-8' })
      saveAs(htmlBlob, `${formattedName}_html.html`)

      if (supportsMJML) {
        const mjmlResult = await generateMJMLCode()
        if (mjmlResult?.prettyMjml) {
          const mjmlBlob = new Blob([mjmlResult.prettyMjml], { type: 'text/html;charset=utf-8' })
          saveAs(mjmlBlob, `${formattedName}_mjml.html`)
        }
      }

      toast.success(
        <span>
          <strong>{formattedName}</strong>
          <br />
          {supportsMJML ? 'HTML & MJML downloaded' : 'HTML downloaded'}
        </span>,
        { autoClose: 3000 }
      )
      await processImages()
    } catch (err) {
      console.error('Error downloading all items:', err)
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

  const downloadAllRef = useRef(handleDownloadAll)
  const downloadHTMLRef = useRef(handleFullDownloadHTML)
  const resetAllRef = useRef(handleResetAll)

  downloadAllRef.current = handleDownloadAll
  downloadHTMLRef.current = handleFullDownloadHTML
  resetAllRef.current = handleResetAll

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      const key = e.key.toLowerCase()

      if (key === 's' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()

        if (isAnalyzingRef.current) return

        const currentCategory = activeCategoryRef.current?.toLowerCase()
        const isFullPackageCategory = ['finance', 'health', 'pets'].includes(currentCategory)

        if (isFullPackageCategory) {
          downloadAllRef.current()
        } else {
          downloadHTMLRef.current()
        }
      }

      if (key === 'r' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        resetAllRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  return (
    <div className="limit-main">
      <div className="limit">
        <div className="main-input-number-block">
          <div className="input-name-block">
            <button type="button" tabIndex={-1} className="button-number button-decrement" onClick={() => changeNumber(-1)}>
              <svg viewBox="0 0 15 3" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 1.5C0 0.671573 0.671573 0 1.5 0H13.5C14.3284 0 15 0.671573 15 1.5C15 2.32843 14.3284 3 13.5 3H1.5C0.671573 3 0 2.32843 0 1.5Z" />
              </svg>
            </button>

            <div className="field">
              <div className="field__line"></div>
              <input
                ref={fileNameInputRef}
                tabIndex={1}
                className="field__area input-name"
                id="fileName"
                type="text"
                value={fileName}
                onChange={handleFileNameChange}
                placeholder=""
                autoComplete="off"
              />
            </div>

            <button type="button" tabIndex={-1} className="button-number button-increment" onClick={() => changeNumber(1)}>
              <svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 7.5C0 6.67157 0.671573 6 1.5 6H13.5C14.3284 6 15 6.67157 15 7.5C15 8.32843 14.3284 9 13.5 9H1.5C0.671573 9 0 8.32843 0 7.5Z" />
                <path d="M7.5 15C6.67157 15 6 14.3284 6 13.5L6 1.5C6 0.671573 6.67157 0 7.5 0V0C8.32843 0 9 0.671573 9 1.5V13.5C9 14.3284 8.32843 15 7.5 15V15Z" />
              </svg>
            </button>
          </div>

          {/* Переключатель режимов конвертации Basic / Advanced */}
          <div className="category-wrap _show" style={{ marginRight: '8px' }}>
            <button
              type="button"
              className={`main-btn main-btn_noicon category-wrap__link ${mode === 'basic' ? '_active' : ''}`}
              onClick={() => {
                setMode('basic')
                toast.info('Basic Mode', { autoClose: 1500, hideProgressBar: true })
              }}
            >
              <span>Basic</span>
            </button>

            <button
              type="button"
              className={`main-btn main-btn_noicon category-wrap__link ${mode === 'advanced' ? '_active' : ''}`}
              onClick={() => {
                setMode('advanced')
                toast.info('Custom Mode', { autoClose: 1500, hideProgressBar: true })
              }}
            >
              <span>Custom</span>
            </button>
          </div>

          {hasImages && availableCategories && availableCategories.length > 1 && (
            <div className="category-wrap _show">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`main-btn main-btn_noicon category-wrap__link ${activeCategory === cat.toLowerCase() ? '_active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-cols flex-cols_cat">
          <div className="flex-col">
            <div className="primary-text-editor-wrapper">
              <div className="primary-text-editor-bg field-big" style={{ borderRadius: '16px' }}>
                <div className="field-big__line"></div>
                <div
                  ref={editorRef}
                  tabIndex={2}
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
                    title={supportsMJML ? 'Download HTML, MJML & Images' : 'Download HTML & Images'}
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: supportsMJML ? '1fr 1fr' : '1fr 0fr',
                  gap: supportsMJML ? '20px' : '0px',
                  transition: 'grid-template-rows 0.25s ease, gap 0.25s ease',
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
                  {supportsMJML && (
                    <div className="code-inner-block" style={{ height: '100%' }}>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
