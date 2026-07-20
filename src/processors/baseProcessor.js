export class BaseProcessor {
  constructor(categoryName) {
    this.categoryName = categoryName
  }

  cleanEmptyTags(html) {
    let result = html.replace(/&nbsp;/g, ' ')
    result = result.replace(/<b>\s*<\/b>/g, '')
    result = result.replace(/<li>\s*<\/li>/g, '')
    return result
  }

  // Общий метод для всех направлений
  processHTML(html, promoName) {
    return this.cleanEmptyTags(html)
  }

  processMJML(html, promoName) {
    return this.cleanEmptyTags(html)
  }
}