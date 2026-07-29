import React from 'react'
import { toast } from 'react-toastify'
import { getBlobFromSrc, toJpeg600 } from './imageProcessor'

const PROXY_URL = "https://small-fire-960e.pingo-mw2.workers.dev/"

export async function uploadImagesToS3(imgs, categoryText, folderName, activeCategoryBtn, toastId) {
  const letters = folderName.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const digits = folderName.replace(/[^0-9]/g, '')

  if (!letters || !digits) {
    if (toastId) {
      toast.update(toastId, {
        render: '❌ Invalid folder format (e.g. AA10)',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      })
    }
    return
  }

  const licenseKey = (localStorage.getItem('license_key') || '').trim()
  if (!licenseKey) {
    if (toastId) {
      toast.update(toastId, {
        render: '❌ Missing License Key S3',
        type: 'error',
        isLoading: false,
        autoClose: 4000
      })
    }
    return
  }

  const totalCount = imgs.length
  const totalWord = totalCount === 1 ? 'image' : 'images'

  if (toastId) {
    toast.update(toastId, {
      render: `⚙️ Preparing ${totalCount} ${totalWord}...`,
      type: 'info',
      isLoading: true
    })
  }

  // 1. Определение параметров URL на основе категории
  let parentParam = 'global'
  let apiFolder = ''
  let generatedBrowserUrl = ''
  const currentCat = (categoryText || '').toLowerCase()

  if (currentCat === 'alpha') {
    parentParam = 'alpha'
    const formattedName = `${letters}/lift-${digits}`
    apiFolder = `promo/${formattedName}`
    generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/alphaone/promo/${letters}/lift-${digits}/`
  } else if (currentCat === 'terra') {
    parentParam = 'organic'
    const formattedName = `${letters}/creative-${digits}`
    apiFolder = `creatives/${formattedName}`
    generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/organic/creatives/${letters}/creative-${digits}/`
  } else if (currentCat === 'red') {
    parentParam = 'redeagle'
    const formattedName = `${letters}/lift-${digits}`
    apiFolder = `promo/${formattedName}`
    generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/redeagle/promo/${letters}/lift-${digits}/`
  } else {
    parentParam = 'global'
    const formattedName = `${letters}/lift-${digits}`
    const originCategoryName = activeCategoryBtn?.textContent
      ? activeCategoryBtn.textContent.trim().toLowerCase()
      : (typeof activeCategoryBtn === 'string' ? activeCategoryBtn : 'finance')

    apiFolder = `Promo/${originCategoryName}/${formattedName}`
    generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/files/Promo/${encodeURIComponent(originCategoryName)}/${letters}/lift-${digits}/`
  }

  // 2. Подготовка обработанных блобов параллельно
  const prepareTask = Array.from(imgs).map(async (img, idx) => {
    const src = img.getAttribute('src')
    if (!src) return null

    const blob = await getBlobFromSrc(src)
    if (!blob) return null

    const { outBlob } = await toJpeg600(blob, '#ffffff')

    return {
      fileName: `img-${idx + 1}.jpg`,
      blobWithMeta: outBlob
    }
  })

  const preparedImages = (await Promise.all(prepareTask)).filter(Boolean)

  if (preparedImages.length === 0) {
    if (toastId) toast.dismiss(toastId)
    return
  }

  if (toastId) {
    toast.update(toastId, {
      render: `🚀 Uploading ${preparedImages.length} ${totalWord} to S3...`,
      type: 'info',
      isLoading: true
    })
  }

  let uploadedCount = 0
  let existsCount = 0

  // 3. Отправка на сервер S3 параллельно
  const uploadTask = preparedImages.map(async (item) => {
    const apiPath = `${apiFolder}/${item.fileName}`
    const originalApiUrl = `https://public.epcnetwork.dev/upload?parent=${parentParam}&path=${apiPath}`
    const apiUrl = `${PROXY_URL}?url=${encodeURIComponent(originalApiUrl)}`

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'Authorization': `License ${licenseKey}`
        },
        body: item.blobWithMeta
      })

      const responseText = await response.text()

      if (!response.ok) {
        if (response.status === 409 || responseText.includes('already exists')) {
          existsCount++
        }
      } else {
        uploadedCount++
      }
    } catch (err) {
      console.error(`S3 Upload error [${item.fileName}]:`, err)
    }
  })

  await Promise.all(uploadTask)

  // 4. Формирование финального статуса
  const upWord = uploadedCount === 1 ? 'image' : 'images'
  const exWord = existsCount === 1 ? 'image' : 'images'

  let statusText = ''
  let statusType = 'success'

  if (uploadedCount > 0 && existsCount === 0) {
    statusText = `Successfully uploaded ${uploadedCount} ${upWord}!`
  } else if (uploadedCount === 0 && existsCount > 0) {
    statusText = `${existsCount} ${exWord} already exist on server.`
    statusType = 'warning'
  } else if (uploadedCount > 0 && existsCount > 0) {
    statusText = `✅ Uploaded: ${uploadedCount} ${upWord} | ⚠️ Exist: ${existsCount} ${exWord}`
  } else {
    statusText = `❌ S3 Upload failed.`
    statusType = 'error'
  }

  if (toastId) {
    toast.update(toastId, {
      render: () =>
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          React.createElement('span', null, statusText),
          generatedBrowserUrl &&
          React.createElement(
            'a',
            {
              href: generatedBrowserUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                display: 'inline-block',
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '13px',
                marginTop: '4px'
              }
            },
            '📂 Open S3 Folder'
          )
        ),
      type: statusType,
      isLoading: false,
      autoClose: false,
      closeOnClick: false,
      closeButton: true
    })
  }
}