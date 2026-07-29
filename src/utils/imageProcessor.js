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