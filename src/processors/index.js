import financeProcessor from './financeProcessor'
import alphaProcessor from './alphaProcessor'
import organicProcessor from './organicProcessor'

export function getProcessor(category) {
  switch (category?.toLowerCase()) {
    case 'alpha':
      return alphaProcessor
    case 'terra':
      return organicProcessor
    case 'finance':
    case 'health':
    case 'pets':
    default:
      return financeProcessor
  }
}