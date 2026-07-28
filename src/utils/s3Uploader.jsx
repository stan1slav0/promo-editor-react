import React from 'react'
import { toast } from 'react-toastify'
import { getBlobFromSrc, toJpeg600, injectMetadata } from './imageProcessor'

const PROXY_URL = "https://small-fire-960e.pingo-mw2.workers.dev/"

export async function uploadImagesToS3(imgs, categoryText, folderName, activeCategoryBtn, toastId) {
  const letters = folderName.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const digits = folderName.replace(/[^0-9]/g, '')

  if (!letters || !digits) {
    if (toastId) {
      toast.update(toastId, {
        render: 'Invalid folder format',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      })
    }
    return
  }

  const totalCount = imgs.length
  const totalWord = totalCount === 1 ? 'image' : 'images'

  if (toastId) {
    toast.update(toastId, {
      render: `🚀 S3 Auto-Upload Mode: sending ${totalCount} ${totalWord}...`,
      type: 'info',
      isLoading: true
    })
  }

  let index = 1
  let uploadedCount = 0
  let existsCount = 0
  let generatedBrowserUrl = ''

  for (const img of imgs) {
    const src = img.getAttribute('src')
    if (!src) continue

    if (toastId) {
      toast.update(toastId, {
        render: `⚙️ Processing image ${index} of ${totalCount}...`,
        type: 'info',
        isLoading: true
      })
    }

    const blob = await getBlobFromSrc(src)
    if (!blob) {
      index++
      continue
    }

    const { outBlob } = await toJpeg600(blob, '#ffffff')
    const blobWithMeta = await injectMetadata(outBlob, categoryText)

    const fileName = `img-${index}.jpg`

    if (toastId) {
      toast.update(toastId, {
        render: `📤 Uploading image ${index} of ${totalCount}...`,
        type: 'info',
        isLoading: true
      })
    }

    let apiPath = ''
    let parentParam = 'global'
    const currentCat = (categoryText || '').toLowerCase()

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
    } else if (currentCat === 'red') {
      parentParam = 'redeagle'
      const formattedName = `${letters}/lift-${digits}`
      apiPath = `promo/${formattedName}/${fileName}`
      generatedBrowserUrl = `https://s3-browser.epcnetwork.dev/bucket/redeagle/promo/${letters}/lift-${digits}/`
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
          if (toastId) {
            toast.update(toastId, {
              render: '❌ No License Key provided.',
              type: 'error',
              isLoading: false,
              autoClose: 4000
            })
          }
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
      console.error('S3 Upload error:', err)
    }

    index++
    await new Promise(r => setTimeout(r, 300))
  }

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

  // Финальный всплывающий тост — НЕ закрывается автоматически
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