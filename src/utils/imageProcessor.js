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

  const outBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', parseFloat(quality)))
  return { outBlob, targetW, targetH }
}

export async function injectMetadata(blob, category) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = function () {
      const base64Data = reader.result
      const zeroth = {}
      zeroth[piexif.ImageIFD.ImageDescription] = category

      const exifObj = { "0th": zeroth, "Exif": {}, "GPS": {} }
      const exifBytes = piexif.dump(exifObj)
      const newBase64 = piexif.insert(exifBytes, base64Data)

      const byteString = atob(newBase64.split(',')[1])
      const mimeString = newBase64.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      resolve(new Blob([ab], { type: mimeString }))
    }
    reader.readAsDataURL(blob)
  })
}