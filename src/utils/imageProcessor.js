import piexif from 'piexifjs'

export async function getBlobFromSrc(src) {
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.blob()
  } catch (e) {
    console.error('⚠️ Ошибка загрузки изображения:', src, e)
    return null
  }
}

export async function toJpeg600(blob, bgColor = '#ffffff', quality = 0.82) {
  const bmp = await createImageBitmap(blob)
  const naturalW = bmp.width
  const naturalH = bmp.height
  const targetW = Math.min(600, naturalW)
  const targetH = Math.round(naturalH * (targetW / naturalW))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, targetW, targetH)
  ctx.drawImage(bmp, 0, 0, targetW, targetH)

  // ⚡ Освобождаем память из GPU/RAM
  bmp.close()

  const parsedQuality = typeof quality === 'number' ? quality : parseFloat(quality) || 0.82
  const outBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', parsedQuality))

  return { outBlob, targetW, targetH }
}

export async function injectMetadata(blob, category) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = async () => {
      try {
        const base64Data = reader.result
        const zeroth = {}
        zeroth[piexif.ImageIFD.ImageDescription] = category

        const exifObj = { "0th": zeroth, "Exif": {}, "GPS": {} }
        const exifBytes = piexif.dump(exifObj)
        const newBase64 = piexif.insert(exifBytes, base64Data)

        // ⚡ Быстрая и лаконичная конвертация base64 обратно в Blob
        const res = await fetch(newBase64)
        const finalBlob = await res.blob()

        resolve(finalBlob)
      } catch (err) {
        console.error('❌ EXIF Injection failed:', err)
        resolve(blob) // В случае ошибки возвращаем исходный блоб
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}