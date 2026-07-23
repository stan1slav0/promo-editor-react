import financeProcessor from './financeProcessor'
import alphaProcessor from './alphaProcessor'
import organicProcessor from './organicProcessor'
import redProcessor from './redProcessor'

export function getProcessor(category) {
  switch (category?.toLowerCase()) {
    case 'alpha':
      return alphaProcessor
    case 'terra':
      return organicProcessor
    case 'red':
      return redProcessor
    case 'finance':
    case 'health':
    case 'pets':
    default:
      return financeProcessor
  }
}