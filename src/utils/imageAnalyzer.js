import { toast } from 'react-toastify'

const PROXY_URL = "https://small-fire-960e.pingo-mw2.workers.dev"
const CONCISE_PROMPT = "Describe this image in 3 to 7 words for an HTML alt tag. Be extremely concise, direct, and omit words like 'image of' or 'picture of'."

async function imgToBase64(imgElement) {
  const src = imgElement.getAttribute('src')
  if (!src) return null
  if (src.startsWith('data:image')) return src

  try {
    const response = await fetch(src)
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('Failed to convert img to base64', e)
    return null
  }
}

async function processSingleImage(img, licenseKey) {
  if (img.getAttribute('data-ai-analyzed') === 'true') return false

  img.setAttribute('data-ai-analyzed', 'true')
  const base64 = await imgToBase64(img)
  if (!base64) return false

  try {
    const res = await fetch(`${PROXY_URL}/analyze-alt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `License ${licenseKey}`
      },
      body: JSON.stringify({ imageBase64: base64, prompt: CONCISE_PROMPT }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.alt) {
        const cleanAlt = data.alt.trim().replace(/^["']|["']$/g, '').replace(/"/g, '&quot;')
        img.setAttribute('alt', cleanAlt)
        return true
      }
    }
  } catch (err) {
    console.error('❌ AI Alt error:', err)
  }

  return false
}

export async function generateAltTextsForImages(imgs, toastId) {
  const licenseKey = (localStorage.getItem('license_key') || '').trim()

  if (!licenseKey) {
    console.error('❌ AI Alt generation canceled: Missing License Key.')
    if (toastId) toast.dismiss(toastId)
    return 0
  }

  const unanalyzedImgs = Array.from(imgs).filter(
    img => img.getAttribute('data-ai-analyzed') !== 'true'
  )

  if (unanalyzedImgs.length === 0) {
    if (toastId) toast.dismiss(toastId)
    return 0
  }

  if (toastId) {
    toast.update(toastId, {
      render: `🤖 AI analyzing ${unanalyzedImgs.length} image${unanalyzedImgs.length > 1 ? 's' : ''}...`,
      type: 'info',
      isLoading: true
    })
  }

  // ⚡ Запускаем обработку всех картинок ПАРАЛЛЕЛЬНО
  const results = await Promise.all(
    unanalyzedImgs.map(img => processSingleImage(img, licenseKey))
  )

  const processedCount = results.filter(Boolean).length

  if (toastId) {
    if (processedCount > 0) {
      const word = processedCount === 1 ? 'image' : 'images'
      toast.update(toastId, {
        render: `${processedCount} ${word} ready for upload.`,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        closeOnClick: false,
        closeButton: false
      })
    } else {
      toast.dismiss(toastId)
    }
  }

  return processedCount
}