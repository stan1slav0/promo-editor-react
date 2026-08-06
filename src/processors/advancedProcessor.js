import { convertAdvancedDetailed } from '../htmlConverter/advanced/index'
import { getAdvancedProfile } from '../htmlConverter/advanced/profiles'

import financeProcessor from './financeProcessor'
import alphaProcessor from './alphaProcessor'
import organicProcessor from './organicProcessor'
import redProcessor from './redProcessor'

const normalizeCategory = (category) => (category || 'finance').toLowerCase()

function getImageUrlProcessor(category) {
  switch (normalizeCategory(category)) {
    case 'alpha':
      return alphaProcessor
    case 'terra':
      return organicProcessor
    case 'red':
      return redProcessor
    default:
      return financeProcessor
  }
}

function prepareImageSources(rawHtml, promoName, category) {
  const document = new DOMParser().parseFromString(`<body>${rawHtml}</body>`, 'text/html')
  const urlProcessor = getImageUrlProcessor(category)

  document.body.querySelectorAll('img').forEach((img, index) => {
    const dynamicSrc = urlProcessor.generateDynamicImgSrc(index + 1, promoName, category)
    img.setAttribute('src', dynamicSrc)
  })

  return document.body.innerHTML
}

class AdvancedProcessor {
  constructor() {
    this.categoryName = 'finance'
    this.hasMJML = false
    this.lastWarnings = []
  }

  setCategory(category) {
    this.categoryName = normalizeCategory(category)
  }

  async exportHTML(rawEditorContent, promoName) {
    const preparedHtml = prepareImageSources(
      rawEditorContent || '',
      promoName,
      this.categoryName,
    )

    const result = convertAdvancedDetailed(
      preparedHtml,
      getAdvancedProfile(this.categoryName),
    )

    this.lastWarnings = result.warnings

    if (result.warnings.length > 0) {
      console.warn('[AdvancedProcessor]', ...result.warnings)
    }

    return result.html
  }

  async exportMJML() {
    return ''
  }
}

export default new AdvancedProcessor()
