import { toast } from 'react-toastify'

const PROXY_URL = "https://small-fire-960e.pingo-mw2.workers.dev"

async function imgToBase64(imgElement) {
  const src = imgElement.getAttribute('src')
  if (!src) return null

  if (src.startsWith('data:image')) {
    return src
  }

  try {
    const response = await fetch(src)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('Failed to convert img to base64', e)
    return null
  }
}

export async function generateAltTextsForImages(imgs, toastId) {
  let index = 1

  let licenseKey = localStorage.getItem('license_key')
  if (!licenseKey || !licenseKey.trim()) {
    licenseKey = prompt('🔑 Для генерации ALT нужен License Key:')
    if (licenseKey && licenseKey.trim()) {
      localStorage.setItem('license_key', licenseKey.trim())
    } else {
      console.error('❌ AI Alt generation canceled: Missing License Key.')
      if (toastId) toast.dismiss(toastId)
      return 0
    }
  }

  const concisePrompt = "Describe this image in 3 to 7 words for an HTML alt tag. Be extremely concise, direct, and omit words like 'image of' or 'picture of'."
  let processedCount = 0

  for (const img of imgs) {
    if (img.getAttribute('data-ai-analyzed') === 'true') {
      index++
      continue
    }

    if (toastId) {
      toast.update(toastId, {
        render: `🤖 AI analyzing image ${index} of ${imgs.length}...`,
        type: 'info',
        isLoading: true
      })
    }

    const base64 = await imgToBase64(img)
    if (!base64) {
      img.setAttribute('data-ai-analyzed', 'true')
      index++
      continue
    }

    try {
      const res = await fetch(`${PROXY_URL}/analyze-alt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `License ${licenseKey.trim()}`
        },
        body: JSON.stringify({
          imageBase64: base64,
          prompt: concisePrompt
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.alt) {
          let cleanAlt = data.alt.trim()
          cleanAlt = cleanAlt.replace(/^["']|["']$/g, '')
          cleanAlt = cleanAlt.replace(/"/g, '&quot;')

          img.setAttribute('alt', cleanAlt)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error(`❌ [Image ${index}/${imgs.length}] AI Request failed (${res.status}):`, errData.error || res.statusText)
      }
    } catch (err) {
      console.error(`❌ [Image ${index}/${imgs.length}] Error during AI generation:`, err)
    } finally {
      img.setAttribute('data-ai-analyzed', 'true')
      processedCount++
    }

    index++
  }

  if (toastId && processedCount > 0) {
    const word = processedCount === 1 ? 'image' : 'images'
    toast.update(toastId, {
      render: `✅ AI finished! ${processedCount} ${word} processed.`,
      type: 'success',
      isLoading: false,
      autoClose: 3000
    })
  } else if (toastId) {
    toast.dismiss(toastId)
  }

  return processedCount
}