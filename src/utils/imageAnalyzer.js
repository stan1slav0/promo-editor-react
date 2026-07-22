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

export async function generateAltTextsForImages(imgs, onProgress) {
  let index = 1

  // 🔑 1. Получаем ключ или запрашиваем его, если отсутствует
  let licenseKey = localStorage.getItem('license_key')
  if (!licenseKey || !licenseKey.trim()) {
    licenseKey = prompt('🔑 Для генерации ALT нужен License Key:')
    if (licenseKey && licenseKey.trim()) {
      localStorage.setItem('license_key', licenseKey.trim())
    } else {
      console.error('❌ AI Alt generation canceled: Missing License Key.')
      return
    }
  }

  // 🎯 ИНСТРУКЦИЯ ДЛЯ ЛАКОНИЧНОСТИ (передаем в Worker / AI API)
  const concisePrompt = "Describe this image in 3 to 7 words for an HTML alt tag. Be extremely concise, direct, and omit words like 'image of' or 'picture of'."

  for (const img of imgs) {
    const currentAlt = img.getAttribute('alt')

    // Пропускаем картинки с уже готовым alt
    if (currentAlt && currentAlt.trim() !== '') {
      console.log(`ℹ️ [Image ${index}/${imgs.length}] Already has ALT: "${currentAlt}"`)
      index++
      continue
    }

    if (onProgress) {
      onProgress(`AI analyzing image ${index} of ${imgs.length}... 🤖`)
    }

    const base64 = await imgToBase64(img)
    if (!base64) {
      console.warn(`⚠️ [Image ${index}/${imgs.length}] Could not get base64 for image.`)
      index++
      continue
    }

    try {
      console.log(`⏳ [Image ${index}/${imgs.length}] Sending image to Cloudflare AI...`)

      // 📤 2. Передаем `prompt` вместе с `imageBase64`
      const res = await fetch(`${PROXY_URL}/analyze-alt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `License ${licenseKey.trim()}`
        },
        body: JSON.stringify({
          imageBase64: base64,
          prompt: concisePrompt // 👈 Передаем требование к короткому тексту
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.alt) {
          // 💡 3. Очистка и безопасное экранирование двойных кавычек
          let cleanAlt = data.alt.trim()

          // Удаляем внешние кавычки, если нейросеть обернула ими весь текст
          cleanAlt = cleanAlt.replace(/^["']|["']$/g, '')

          // Заменяем внутренние двойные кавычки на HTML сущность &quot;
          cleanAlt = cleanAlt.replace(/"/g, '&quot;')

          img.setAttribute('alt', cleanAlt)
          console.log(`✅ [Image ${index}/${imgs.length}] Generated ALT: "%c${cleanAlt}"`, 'color: #4caf50; font-weight: bold;')
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error(`❌ [Image ${index}/${imgs.length}] AI Request failed (${res.status}):`, errData.error || res.statusText)
      }
    } catch (err) {
      console.error(`❌ [Image ${index}/${imgs.length}] Error during AI generation:`, err)
    }

    index++
  }
}