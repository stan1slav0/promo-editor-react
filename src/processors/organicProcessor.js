import prettier from 'prettier/standalone'
import prettierPluginHtml from 'prettier/plugins/html'

// Синий спектр цветов для кликабельных ссылок Organic
const blueColors = [
  '#0000FF', 'rgb\\(0,\\s*0,\\s*255\\)', '#CFE2F3', 'rgb\\(207,\\s*226,\\s*243\\)',
  '#9FC5E8', 'rgb\\(159,\\s*197,\\s*232\\)', '#6FA8DC', 'rgb\\(111,\\s*168,\\s*220\\)',
  '#3D85C6', 'rgb\\(61,\\s*133,\\s*198\\)', '#0B5394', 'rgb\\(11,\\s*83,\\s*148\\)',
  '#073763', 'rgb\\(7,\\s*55,\\s*99\\)', '#4A86E8', 'rgb\\(74,\\s*134,\\s*232\\)',
  '#C9DAF8', 'rgb\\(201,\\s*218,\\s*248\\)', '#A4C2F4', 'rgb\\(164,\\s*194,\\s*244\\)',
  '#6D9EEB', 'rgb\\(109,\\s*158,\\s*235\\)', '#1155CC', 'rgb\\(17,\\s*85,\\s*204\\)',
  '#1C4587', 'rgb\\(28,\\s*69,\\s*135\\)', '#3C78D8', 'rgb\\(60,\\s*120,\\s*216\\)',
  '#467886', 'rgb\\(70,\\s*120,\\s*134\\)', '#0033CC', 'rgb\\(0,\\s*51,\\s*204\\)',
  '#0066B3', 'rgb\\(0,\\s*102,\\s*179\\)'
]

class OrganicProcessor {
  constructor() {
    this.categoryName = 'terra'
    this.hasMJML = false // Отключает MJML кнопки и блоки
  }

  // Динамическая генерация пути картинок для Organic
  generateDynamicImgSrc(index, promoNameFormatted) {
    const promoName = (promoNameFormatted || 'promo').toLowerCase()
    const prefixMatch = promoName.match(/[a-z]+/)
    const suffixMatch = promoName.match(/\d+/)

    const prefix = prefixMatch ? prefixMatch[0] : 'promo'
    const suffix = suffixMatch ? suffixMatch[0] : '0'

    return `https://ogfinstorage.com/files/creatives/${prefix}/creative-${suffix}/img-${index}.jpg`
  }

  async formatWithPrettier(htmlString) {
    try {
      let formatted = await prettier.format(htmlString, {
        parser: 'html',
        plugins: [prettierPluginHtml],
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        singleAttributePerLine: false,
        bracketSameLine: true,
        htmlWhitespaceSensitivity: 'ignore',
      })

      formatted = formatted.trim()

      formatted = formatted.replace(/(<[a-z0-9]+)\s+([^>]+?)\s*>/gi, (match, tag, attrs) => {
        const cleanAttrs = attrs.replace(/\s+/g, ' ').trim()
        return `${tag} ${cleanAttrs}>`
      })

      formatted = formatted.replace(/<br\s*\/?>/gi, '<br>')
      formatted = formatted.replace(/<br>\s+(?=<br>)/g, '<br>')
      formatted = formatted.replace(/\s+([.,!?:;])/g, '$1')

      formatted = formatted.replace(/(<a[^>]*>)([\s\S]*?)(<\/a>)/gi, (match, startTag, content, endTag) => {
        const cleanContent = content.replace(/\s+/g, ' ').trim()
        return `${startTag}${cleanContent}${endTag}`
      })

      return formatted
    } catch (e) {
      console.error('Ошибка Prettier:', e)
      return htmlString
    }
  }

  italicLinks(htmlContent) {
    htmlContent = htmlContent.replace(/<a[^>]*>/gi, '').replace(/<\/a>/gi, '')
    blueColors.forEach((color) => {
      const regex = new RegExp(`<span[^>]*style="[^"]*color:\\s*${color}[^"]*;[^"]*font-style:\\s*italic[^"]*"[^>]*>(.*?)<\\/span>`, 'gi')
      htmlContent = htmlContent.replace(regex, '<a href="urlhere" style="font-family:\'Roboto\', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700;color: #0000EE;"><em>$1</em></a>')
    })
    return htmlContent
  }

  linksStyles(htmlContent) {
    blueColors.forEach((color) => {
      const reg = new RegExp(`<span[^>]*style="[^"]*color:\\s*(${color})[^"]*"[^>]*>(.*?)<\\/span>`, 'gi')
      htmlContent = htmlContent.replace(reg, '<a href="urlhere" style="font-family:\'Roboto\', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700;color: #0000EE;">$2</a>')
    })
    return htmlContent
  }

  replaceAllEmojisAndSymbolsExcludingHTML(htmlContent) {
    const rx = /(?:\p{Extended_Pictographic}|(?![<>=&%"'#;:_-])[\p{S}\p{No}])(?:\uFE0F)?/gu
    return htmlContent.replace(rx, match => {
      return Array.from(match)
        .map(ch => `&#${ch.codePointAt(0)};`)
        .join('')
    })
  }

  processStyles(htmlContent) {
    htmlContent = htmlContent.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*font-style:\s*italic[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<i style="text-decoration: underline;font-weight: bold;">$1</i>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<i style="text-decoration: underline;">$1</i>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi, '<b style="font-style: italic;">$1</b>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<b style="text-decoration: underline;">$1</b>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<u>$1</u>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-weight:\s*700[^"]*"[^>]*>(.*?)<\/span>/gi, '<b>$1</b>')
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi, '<i>$1</i>')

    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, ' ')
    htmlContent = htmlContent.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '')
    htmlContent = htmlContent.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '')
    htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, '')

    htmlContent = htmlContent.replace(/<table[^>]*>/gi, '').replace(/<\/table>/gi, '')
    htmlContent = htmlContent.replace(/<tbody[^>]*>/gi, '').replace(/<\/tbody>/gi, '')
    htmlContent = htmlContent.replace(/<tr[^>]*>/gi, '').replace(/<\/tr>/gi, '')
    htmlContent = htmlContent.replace(/<td[^>]*>/gi, '').replace(/<\/td>/gi, '')
    htmlContent = htmlContent.replace(/<col[^>]*>/gi, '').replace(/<\/col>/gi, '')
    htmlContent = htmlContent.replace(/<colgroup[^>]*>/gi, '').replace(/<\/colgroup>/gi, '')

    return htmlContent
  }

  wrapSmallCenterTextHtml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSmallTextHtml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterHeadlineHtml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:center;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <b style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:center;color:#000000;">
                       ${content}
                  </b>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterQuoteHtml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-left: 20px;padding-right: 20px;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr> 
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapQuoteHtml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-left: 20px;padding-right: 20px;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr>            
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapHeadlineHtml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <strong style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;color:#000000;">
                       ${content}
                  </strong>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterTextHtml(htmlContent) {
    return htmlContent.replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                    <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                        ${content}
                    </div>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapButtonHtml(htmlContent) {
    return htmlContent.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
              
              <tr>
                 <td align="center" style="padding-top: 14px; padding-bottom: 14px;">

                    <table cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                            <td class="creative-button" height="51" align="center" style="border-radius: 10px;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;font-weight: bold; color: #FFFFFF; padding: 3px 5px; background-color: #28b628;" bgcolor="#28b628">
                               <a href="urlhere" target="_blank" style="font-weight: bold;text-decoration:none;color:#ffffff;padding: 9px 15px;display: block;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;background-color: #28b628;border-radius: 10px;">
                                    ${content}
                               </a>
                            </td>
                        </tr>
                    </table>
                 </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapRightSideImg(htmlContent) {
    return htmlContent.replace(/i-r-s([\s\S]*?)i-r-s-e/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
              <tr>
                <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 15px; padding-top: 15px;">
                  <a align="right" href="urlhere" target="_blank" style="display: inline-block; float: right; width: 50%; max-width: 50%; margin-left: 18px; margin-bottom: 12px;">
                    <img alt="Preview" height="224"
                         align="right"
                         src="https://ogfinstorage.com/"
                         style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                         width="250"/>
                  </a>
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </div>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapLeftSideImg(htmlContent) {
    return htmlContent.replace(/i-l-s([\s\S]*?)i-l-s-e/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
              <tr>
                <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 14px; padding-top: 14px;">
                  <a align="left" href="urlhere" target="_blank" style="display: inline-block; float: left; width: 50%; max-width: 50%; margin-right: 18px; margin-bottom: 12px;">
                    <img alt="Preview" height="224"
                         align="left"
                         src="https://ogfinstorage.com/"
                         style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                         width="250"/>
                  </a>
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </div>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSignatureImg(htmlContent) {
    return htmlContent.replace(/sign-i([\s\S]*?)sign-i-e/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td class="image-block" align="left" style="padding-top: 15px; padding-bottom: 15px;">
                   <img alt="Signature" height="auto"
                        src="https://ogfinstorage.com/"
                        style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:220px;max-width: 220px;font-size:13px;"
                        width="220"/>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterBlock(htmlContent) {
    return htmlContent.replace(/ftr-s([\s\S]*?)ftr-e/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-top: 25px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterCenterBlock(htmlContent) {
    return htmlContent.replace(/ftr-c([\s\S]*?)ftr-c-e/gi, function (match, content) {
      return `
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-top: 25px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                  </div>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                  <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  replaceTripleBrWithSingle(htmlContent) {
    const BR = `<br>\n`
    htmlContent = htmlContent.replace(/(<br\s*\/?>\s*)+(<\/(?:div|td|tr|table|span)>)/gi, '$2')
    htmlContent = htmlContent.replace(/<\w+[^>]*>\s*<\w+[^>]*>\s*<br\s*\/?>\s*<\/\w+>\s*<\/\w+>/gi, BR)
    htmlContent = htmlContent.replace(/<\w+[^>]*>\s*<br\s*\/?>\s*<\/\w+>/gi, BR)
    htmlContent = htmlContent.replace(/\s*<br\s*\/?>\s*<\/(\w+)>/gi, '</$1><br>')
    htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, BR)
    return htmlContent
  }

  addBrAfterClosingP(htmlContent) {
    htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '')
    htmlContent = htmlContent.replace(/<\/p>(?!\s*<\/li>)/gi, '</p>\n<br><br>\n')
    htmlContent = htmlContent.replace(/<br><br>(\s*<(ol|ul)[^>]*>)/gi, '<br>\n$1')
    htmlContent = htmlContent.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '')
    return htmlContent
  }

  removeStylesFromLists(htmlContent) {
    htmlContent = htmlContent.replace(/<ol[^>]*style="[^"]*"[^>]*>/gi, '<ol>\n')
    htmlContent = htmlContent.replace(/<ul[^>]*style="[^"]*"[^>]*>/gi, '<ul>\n')
    htmlContent = htmlContent.replace(/<li[^>]*style="[^"]*"[^>]*>/gi, '<li>')
    htmlContent = htmlContent.replace(/<\/li*>/gi, '<\/li>\n')
    return htmlContent
  }

  wrapTextInSpan(htmlContent, promoNameFormatted) {
    let currentIdx = 1
    htmlContent = htmlContent.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, () => {
      const dynamicSrc = this.generateDynamicImgSrc(currentIdx++, promoNameFormatted)
      return `      </div>
                       </td>
                   </tr>
                   <tr>
                       <td class="image-block" align="center" style="padding-top: 15px; padding-bottom: 15px;">
                           <a href="urlhere" target="_blank">
                               <img alt="Video preview" height="auto"
                                   src="${dynamicSrc}"
                                   style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width: 560px;font-size:13px;"
                                   width="560"/>
                           </a>
                       </td>
                    </tr>
                    <tr>
                       <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                            <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">`
    })

    htmlContent = `<tr>
                      <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 15px; padding-bottom: 15px;">
                                <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                                    ${htmlContent}
                                </div>
                      </td>
                    </tr>`

    return htmlContent
  }

  cleanEmptyHtmlTags(htmlContent) {
    htmlContent = htmlContent.replace(/&nbsp;/g, ' ')
    htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, '')
    htmlContent = htmlContent.replace(/<li>\s*<\/li>/g, '')
    htmlContent = htmlContent.replace(/<br>\s*<br>\s*<br>\s*<br>/g, '<br><br>')
    htmlContent = htmlContent.replace(/<br>\s*<br>\s*<br>/g, '<br><br>')
    htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<br><br>/gi, '$1')
    htmlContent = htmlContent.replace(/<\/a>\s*<a[^>]*>/g, ' ')
    htmlContent = htmlContent.replace(/<pre>/g, '')
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, ' ')
    htmlContent = htmlContent.replace(/<b[^>]*>\s*<\/b>/g, ' ')
    htmlContent = htmlContent.replace(/<u>\s*<\/u>/g, ' ')
    htmlContent = htmlContent.replace(/<em[^>]*>\s*<\/em>/g, ' ')
    htmlContent = htmlContent.replace(/<\/em>\s*<em[^>]*>/g, ' ')
    htmlContent = htmlContent.replace(/<i[^>]*>\s*<\/i>/g, ' ')
    htmlContent = htmlContent.replace(/<\/i>\s*<i[^>]*>/g, ' ')
    htmlContent = htmlContent.replace(/<br><br>\s*<\/div>/g, '<\/div>')
    htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<\/a>/gi, '$1')
    htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<\/b>/gi, '$1')
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/div>/g, '<\/div>')
    htmlContent = htmlContent.replace(/<b[^>]*>\s*<\/div>/g, '<\/div>')

    htmlContent = htmlContent.replace(/<h1[^>]*>/gi, '').replace(/<\/h1>/gi, '')
    htmlContent = htmlContent.replace(/<h2[^>]*>/gi, '').replace(/<\/h2>/gi, '')
    htmlContent = htmlContent.replace(/<h3[^>]*>/gi, '').replace(/<\/h3>/gi, '')
    htmlContent = htmlContent.replace(/<h4[^>]*>/gi, '').replace(/<\/h4>/gi, '')
    htmlContent = htmlContent.replace(/<h5[^>]*>/gi, '').replace(/<\/h5>/gi, '')
    htmlContent = htmlContent.replace(/<h6[^>]*>/gi, '').replace(/<\/h6>/gi, '')
    htmlContent = htmlContent.replace(/<br><br>\s*<br><br>/g, '<br><br>')
    htmlContent = htmlContent.replace(/<br><br>\s*<\/div>/g, '<\/div>')
    htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<br><br>/gi, '$1')
    htmlContent = htmlContent.replace(/<br>\s*<\/div>/g, '<\/div>')

    htmlContent = htmlContent.replace(/<div[^>]*>\s*<\/div>/g, '')
    htmlContent = htmlContent.replace(/<td[^>]*>\s*<\/td>/g, '')
    htmlContent = htmlContent.replace(/<tr[^>]*>\s*<\/tr>/g, '')
    return htmlContent
  }

  wrapContentInFullTableStructure(htmlContent) {
    return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 100%;">
        <tr>
            <td align="center" valign="top">
                <table class="main-table" bgcolor="#FFFFFF" border="0" cellspacing="0"
                       cellpadding="0" role="presentation" width="100%" style="max-width: 600px;">
                    <tr>
                        <td class="content-wrapper" align="center" style="padding-left: 21px; padding-right: 21px;">
                            <table class="inner-content-wrapper" border="0" cellspacing="0" role="presentation"
                                   cellpadding="0" width="100%" style="width: 100%;">
                                <tr>
                                    <td height="15" width="100%" style="max-width: 100%" class="space-between-sections"></td>
                                </tr>
                                ${htmlContent}
                                <tr>
                                    <td height="15" width="100%" style="max-width: 100%" class="space-between-sections"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>`
  }

  preserveSingleBr(htmlContent) {
    htmlContent = htmlContent.replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, 'ю')
    htmlContent = htmlContent.replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, 'ю')
    return htmlContent
  }

  addOneBr(htmlContent) {
    return htmlContent.replace(/ю/gi, () => `\n                    <br>\n        `)
  }

  // Главный экспорт HTML для Organic Engine
  async exportHTML(rawEditorContent, promoName) {
    let editorContent = rawEditorContent
    editorContent = this.preserveSingleBr(editorContent)
    editorContent = this.italicLinks(editorContent)
    editorContent = this.linksStyles(editorContent)
    editorContent = this.replaceAllEmojisAndSymbolsExcludingHTML(editorContent)
    editorContent = this.processStyles(editorContent)
    editorContent = this.wrapCenterTextHtml(editorContent)
    editorContent = this.wrapSmallCenterTextHtml(editorContent)
    editorContent = this.wrapSmallTextHtml(editorContent)
    editorContent = this.wrapCenterHeadlineHtml(editorContent)
    editorContent = this.wrapHeadlineHtml(editorContent)
    editorContent = this.wrapButtonHtml(editorContent)
    editorContent = this.wrapCenterQuoteHtml(editorContent)
    editorContent = this.wrapQuoteHtml(editorContent)
    editorContent = this.addBrAfterClosingP(editorContent)
    editorContent = this.removeStylesFromLists(editorContent)
    editorContent = this.wrapTextInSpan(editorContent, promoName)
    editorContent = this.wrapRightSideImg(editorContent)
    editorContent = this.wrapLeftSideImg(editorContent)
    editorContent = this.wrapSignatureImg(editorContent)
    editorContent = this.wrapFooterBlock(editorContent)
    editorContent = this.wrapFooterCenterBlock(editorContent)
    editorContent = this.cleanEmptyHtmlTags(editorContent)
    editorContent = this.wrapContentInFullTableStructure(editorContent)

    editorContent = this.addOneBr(editorContent)
    editorContent = this.replaceTripleBrWithSingle(editorContent)

    return await this.formatWithPrettier(editorContent)
  }

  async exportMJML(rawEditorContent, promoName) {
    return await this.exportHTML(rawEditorContent, promoName)
  }
}

export default new OrganicProcessor()