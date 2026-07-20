import { BaseProcessor } from './baseProcessor'

// ⚠️ Должно быть написано "export class", а не "export default class"
export class RedeagleProcessor extends BaseProcessor {
  constructor() {
    super('redeagle')
  }

  generateDynamicImgSrc(index, promoName) {
    const cleanName = (promoName || 'REDEAGLE').replace(/\s+/g, '').toLowerCase()
    return `https://redeagle.media/files/promo/${cleanName}/img-${index}.jpg`
  }

  async exportHTML(rawEditorContent, promoName) {
    let content = rawEditorContent || ''
    let imgIdx = 1

    content = content.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, () => {
      const src = this.generateDynamicImgSrc(imgIdx++, promoName)
      return `<img src="${src}" class="redeagle-img" />`
    })

    content = this.cleanEmptyHtmlTags(content)
    return await this.formatWithPrettier(content)
  }

  async exportMJML(rawEditorContent, promoName) {
    return this.exportHTML(rawEditorContent, promoName)
  }
}