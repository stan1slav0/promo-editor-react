import { getBlobFromSrc, toJpeg600, injectMetadata } from './imageProcessor'

// --- S3 UPLOADER MODULE ---
const PROXY_URL = "https://small-fire-960e.pingo-mw2.workers.dev/"

/**
 * Выполняет загрузку обработанных изображений на S3 сервер через прокси.
 */
export async function uploadImagesToS3(imgs, categoryText, folderName, activeCategoryBtn, logEl) {
  const letters = folderName.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const digits = folderName.replace(/[^0-9]/g, '')

  if (!letters || !digits) {
    logEl.innerHTML = '❌ S3 Error: Invalid folder format (Requires letters and numbers, e.g., SBJC123)<br>'
    return
  }

  const totalCount = imgs.length
  const totalWord = totalCount === 1 ? 'image' : 'images'

  logEl.innerHTML = `🚀 S3 Auto-Upload Mode: sending ${totalCount} ${totalWord}...`

  let index = 1
  let uploadedCount = 0
  let existsCount = 0
  let generatedBrowserUrl = ''

  for (const img of imgs) {
    const src = img.getAttribute('src')
    if (!src) continue

    logEl.innerHTML = `⚙️ Processing image ${index} of ${totalCount}...`

    // ПРЯМОЙ ВЫЗОВ ФУНКЦИИ ИМПОРТА (без window)
    const blob = await getBlobFromSrc(src)
    if (!blob) {
      logEl.innerHTML = `❌ Failed to download source image ${index}`
      index++
      await new Promise(r => setTimeout(r, 1000))
      continue
    }

    const { outBlob } = await toJpeg600(blob, '#ffffff')
    const blobWithMeta = await injectMetadata(outBlob, categoryText)

    const fileName = `img-${index}.jpg`

    logEl.innerHTML = `📤 Uploading image ${index} of ${totalCount}...`

    let apiPath = ''
    let parentParam = 'global'
    const currentCat = categoryText.toLowerCase()

    if (currentCat === 'alpha') {
      parentParam = 'alpha'
      const formattedName = `${letters}/lift-${digits}`
      apiPath = `promo/${formattedName}/${fileName}`
      generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/alphaone/promo/${letters}/lift-${digits}/`
    } else if (currentCat === 'terra') {
      parentParam = 'organic'
      const formattedName = `${letters}/creative-${digits}`
      apiPath = `creatives/${formattedName}/${fileName}`
      generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/organic/creatives/${letters}/creative-${digits}/`
    } else {
      parentParam = 'global'
      const formattedName = `${letters}/lift-${digits}`
      const originCategoryName = activeCategoryBtn?.textContent
        ? activeCategoryBtn.textContent.trim().toLowerCase()
        : (typeof activeCategoryBtn === 'string' ? activeCategoryBtn : 'finance')

      apiPath = `Promo/${originCategoryName}/${formattedName}/${fileName}`
      generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/files/Promo/${encodeURIComponent(originCategoryName)}/${letters}/lift-${digits}/`
    }

    const originalApiUrl = `https://public.epcnetwork.dev/upload?parent=${parentParam}&path=${apiPath}`
    const apiUrl = `${PROXY_URL}?url=${encodeURIComponent(originalApiUrl)}`

    try {

      let licenseKey = localStorage.getItem('license_key')

      if (!licenseKey || !licenseKey.trim()) {
        licenseKey = prompt('🔑 Enter License Key S3:')
        if (licenseKey && licenseKey.trim()) {
          localStorage.setItem('license_key', licenseKey.trim())
        } else {
          logEl.innerHTML = '❌ No License Key.<br>'
          return
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'Authorization': `License ${licenseKey}`
        },
        body: blobWithMeta
      })

      const responseText = await response.text()

      if (!response.ok) {
        if (response.status === 409 || responseText.includes('already exists')) {
          existsCount++
        } else {
          throw new Error(`Server error: ${response.status}`)
        }
      } else {
        uploadedCount++
      }

    } catch (err) {
      logEl.innerHTML = `❌ Image ${index} upload failed: ${err.message}`
      await new Promise(r => setTimeout(r, 1500))
    }

    index++
    await new Promise(r => setTimeout(r, 200))
  }

  const upWord = uploadedCount === 1 ? 'image' : 'images'
  const exWord = existsCount === 1 ? 'image' : 'images'

  if (uploadedCount > 0 && existsCount === 0) {
    logEl.innerHTML = `✅ Successfully uploaded ${uploadedCount} ${upWord}! <a href="${generatedBrowserUrl}" target="_blank" class="output_button_folder">📂 Open S3 Folder</a>`
  } else if (uploadedCount === 0 && existsCount > 0) {
    logEl.innerHTML = `⚠️ All ${existsCount} ${exWord} already exist on server. <a href="${generatedBrowserUrl}" target="_blank" class="output_button_folder">📂 Open S3 Folder</a>`
  } else if (uploadedCount > 0 && existsCount > 0) {
    logEl.innerHTML = `✅ Uploaded: ${uploadedCount} ${upWord} | ⚠️ Already exists: ${existsCount} ${exWord} <a href="${generatedBrowserUrl}" target="_blank" class="output_button_folder">📂 Open S3 Folder</a>`
  } else {
    logEl.innerHTML = `❌ S3 Upload failed.`
  }
}