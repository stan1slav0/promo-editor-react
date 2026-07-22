import prettier from 'prettier/standalone'
import parserHtml from 'prettier/plugins/html'

export class FinanceProcessor {
  constructor(categoryName = 'finance') {
    this.categoryName = categoryName
    this.blueColors = [
      '#0000FF', 'rgb\\(0,\\s*0,\\s*255\\)',
      '#CFE2F3', 'rgb\\(207,\\s*226,\\s*243\\)',
      '#9FC5E8', 'rgb\\(159,\\s*197,\\s*232\\)',
      '#6FA8DC', 'rgb\\(111,\\s*168,\\s*220\\)',
      '#3D85C6', 'rgb\\(61,\\s*133,\\s*198\\)',
      '#0B5394', 'rgb\\(11,\\s*83,\\s*148\\)',
      '#073763', 'rgb\\(7,\\s*55,\\s*99\\)',
      '#4A86E8', 'rgb\\(74,\\s*134,\\s*232\\)',
      '#C9DAF8', 'rgb\\(201,\\s*218,\\s*248\\)',
      '#A4C2F4', 'rgb\\(164,\\s*194,\\s*244\\)',
      '#6D9EEB', 'rgb\\(109,\\s*158,\\s*235\\)',
      '#1155CC', 'rgb\\(17,\\s*85,\\s*204\\)',
      '#1C4587', 'rgb\\(28,\\s*69,\\s*135\\)',
      '#3C78D8', 'rgb\\(60,\\s*120,\\s*216\\)',
      '#467886', 'rgb\\(70,\\s*120,\\s*134\\)',
      '#0033CC', 'rgb\\(0,\\s*51,\\s*204\\)',
      '#0066B3', 'rgb\\(0,\\s*102,\\s*179\\)'
    ]
  }

  // --- Вспомогательный генератор ссылок на изображения ---
  generateDynamicImgSrc(index, promoName, category = 'finance') {
    const rawName = promoName ? promoName.trim() : 'PROMO'
    const cleanPromoName = rawName.replace(/\s+/g, '').toLowerCase()

    const prefixMatch = cleanPromoName.match(/[a-z]+/)
    const suffixMatch = cleanPromoName.match(/\d+/)

    const prefix = prefixMatch ? prefixMatch[0] : 'promo'
    const suffix = suffixMatch ? suffixMatch[0] : '0'

    // Приводим категорию к нижнему регистру (health, pets, finance и т.д.)
    const currentCategory = (category || 'finance').toLowerCase()

    if (currentCategory !== 'alpha') {
      return `https://storage.5th-elementagency.com/files/Promo/${currentCategory}/${prefix}/lift-${suffix}/img-${index}.jpg`
    } else {
      return `https://alphaonest.com/files/promo/${prefix}/lift-${suffix}/img-${index}.jpg`
    }
  }

  // --- Форматирование Prettier ---
  async formatWithPrettier(htmlString) {
    try {
      let formatted = await prettier.format(htmlString, {
        parser: 'html',
        plugins: [parserHtml],
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

  // --- Трансформации ссылок и текста ---
  italicLinks(htmlContent) {
    htmlContent = htmlContent.replace(/<a[^>]*>/gi, '').replace(/<\/a>/gi, '')
    this.blueColors.forEach((color) => {
      const regex = new RegExp(`<span[^>]*style="[^"]*color:\\s*${color}[^"]*;[^"]*font-style:\\s*italic[^"]*"[^>]*>(.*?)<\\/span>`, 'gi')
      htmlContent = htmlContent.replace(
        regex,
        '<a href="urlhere" style="font-family:\'Roboto\', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700; color: #0000EE;"><em>$1</em></a>'
      )
    })
    return htmlContent
  }

  linksStyles(htmlContent) {
    this.blueColors.forEach((color) => {
      const reg = new RegExp(`<span[^>]*style="[^"]*color:\\s*(${color})[^"]*"[^>]*>(.*?)<\\/span>`, 'gi')
      htmlContent = htmlContent.replace(
        reg,
        '<a href="urlhere" style="font-family:\'Roboto\', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700; color: #0000EE;">$2</a>'
      )
    })
    return htmlContent
  }

  replaceAllEmojisAndSymbolsExcludingHTML(htmlContent) {
    const rx = /(?:\p{Extended_Pictographic}|(?![<>=&%"'#;:_-])[\p{S}\p{No}])(?:\uFE0F)?/gu
    return htmlContent.replace(rx, (match) => {
      return Array.from(match)
        .map((ch) => `&#${ch.codePointAt(0)};`)
        .join('')
    })
  }

  processStyles(htmlContent) {
    htmlContent = htmlContent.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '')
    // i and b and u
    htmlContent = htmlContent.replace(
      /<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*font-style:\s*italic[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi,
      '<em style="text-decoration: underline;font-weight: bold;">$1</em>'
    )

    // i and u
    htmlContent = htmlContent.replace(
      /<span[^>]*style="[^"]*font-style:\s*italic[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi,
      '<em style="text-decoration: underline;">$1</em>'
    )

    // i and b
    htmlContent = htmlContent.replace(
      /<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi,
      '<b style="font-style: italic;">$1</b>'
    )

    // b and u
    htmlContent = htmlContent.replace(
      /<span[^>]*style="[^"]*font-weight:\s*700[^"]*;[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi,
      '<b style="text-decoration: underline;">$1</b>'
    )

    // u
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<u>$1</u>')

    // b
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-weight:\s*700[^"]*"[^>]*>(.*?)<\/span>/gi, '<b>$1</b>')

    // i
    htmlContent = htmlContent.replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi, '<em>$1</em>')

    // delete tags
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, ' ')
    htmlContent = htmlContent.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '')
    htmlContent = htmlContent.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '')
    htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, '')

    // delete table tags update
    htmlContent = htmlContent.replace(/<table[^>]*>/gi, '').replace(/<\/table>/gi, '')
    htmlContent = htmlContent.replace(/<tbody[^>]*>/gi, '').replace(/<\/tbody>/gi, '')
    htmlContent = htmlContent.replace(/<tr[^>]*>/gi, '').replace(/<\/tr>/gi, '')
    htmlContent = htmlContent.replace(/<td[^>]*>/gi, '').replace(/<\/td>/gi, '')
    htmlContent = htmlContent.replace(/<col[^>]*>/gi, '').replace(/<\/col>/gi, '')
    htmlContent = htmlContent.replace(/<colgroup[^>]*>/gi, '').replace(/<\/colgroup>/gi, '')

    return htmlContent
  }

  // --- HTML блоки ---
  wrapSmallCenterTextHtml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                  </span>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSmallTextHtml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </span>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterHeadlineHtml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:center;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <strong style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:center;color:#000000;">
                       ${content}
                  </strong>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterQuoteHtml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-left: 20px;padding-right: 20px;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                  </span>
                </td>
            </tr> 
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapQuoteHtml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-left: 20px;padding-right: 20px;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </span>
                </td>
            </tr>            
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapHeadlineHtml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <strong style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;color:#000000;">
                       ${content}
                  </strong>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterTextHtml(htmlContent) {
    return htmlContent.replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
                <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                    <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                        ${content}
                    </span>
                </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapButtonHtml(htmlContent) {
    return htmlContent.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
             <tr>
                <td align="center" style="padding-top: 14px; padding-bottom: 14px;">
                 
                  <table cellpadding="0" cellspacing="0" role="presentation">
                       <tr>
                           <td class="btn-edit-p" height="51" align="center" style="border-radius: 10px;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;font-weight: bold; color: #FFFFFF; padding: 3px 5px; background-color: #28b628;" bgcolor="#28b628">
                               <a href="urlhere" target="_blank" style="font-weight: bold;text-decoration:none;color:#ffffff;padding: 9px 15px;display: block;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;background-color: #28b628;border-radius: 10px;">
                                    ${content}           
                               </a>
                          </td>
                       </tr>
                  </table>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapRightSideImg(htmlContent) {
    return htmlContent.replace(/i-r-s([\s\S]*?)i-r-s-e/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
              <tr>
                <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 14px; padding-top: 14px;">
                  <a align="right" href="urlhere" target="_blank" style="display: inline-block; float: right; width: 50%; max-width: 50%; margin-left: 18px; margin-bottom: 12px;">
                    <img alt="Preview" height="224"
                         align="right"
                         src="https://storage.5th-elementagency.com/"
                         style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                         width="250"/>
                  </a>
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </span>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapLeftSideImg(htmlContent) {
    return htmlContent.replace(/i-l-s([\s\S]*?)i-l-s-e/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
              <tr>
                <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 14px; padding-top: 14px;">
                  <a align="left" href="urlhere" target="_blank" style="display: inline-block; float: left; width: 50%; max-width: 50%; margin-right: 18px; margin-bottom: 12px;">
                    <img alt="Preview" height="224"
                         align="left"
                         src="https://storage.5th-elementagency.com/"
                         style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                         width="250"/>
                  </a>
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                  </span>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterBlock(htmlContent) {
    return htmlContent.replace(/ftr-s([\s\S]*?)ftr-e/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
              <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000; padding-top: 34px; padding-bottom: 14px;">
                <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${content}
                </span>
              </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterCenterBlock(htmlContent) {
    return htmlContent.replace(/ftr-c([\s\S]*?)ftr-c-e/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
            <tr>
              <td align="center" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000; padding-top: 34px; padding-bottom: 14px;">
                <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                    ${content}
                </span>
              </td>
            </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSignatureImg(htmlContent) {
    return htmlContent.replace(/sign-i([\s\S]*?)sign-i-e/gi, function (match, content) {
      return `
                    </span>
                </td>
            </tr>
              <tr>
                <td class="img-bg-block" align="left" style="padding-top: 14px; padding-bottom: 14px;">
                  <img alt="Signature" height="auto"
                       src="sign_url"
                       style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:200px;max-width: 100%;font-size:13px;"
                       width="200"/>
                </td>
              </tr>
            <tr>
               <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                  <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  addOneBr(htmlContent) {
    return htmlContent.replace(/ю/gi, '<br>')
  }

  replaceTripleBrWithSingle(htmlContent) {
    const BR = `<br>\n`
    htmlContent = htmlContent.replace(/<\w+[^>]*>\s*<\w+[^>]*>\s*<br\s*\/?>\s*<\/\w+>\s*<\/\w+>/gi, BR)
    htmlContent = htmlContent.replace(/<\w+[^>]*>\s*<br\s*\/?>\s*<\/\w+>/gi, BR)
    htmlContent = htmlContent.replace(/\s*<br\s*\/?>\s*<\/(\w+)>/gi, '</$1><br>')
    htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, BR)
    return htmlContent
  }

  // --- MJML блоки ---
  wrapSmallCenterTextMjml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                    </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSmallTextMjml(htmlContent) {
    return htmlContent.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterHeadlineMjml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:center;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapHeadlineMjml(htmlContent) {
    return htmlContent.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterQuoteMjml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 45px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapQuoteMjml(htmlContent) {
    return htmlContent.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 45px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapCenterTextMjml(htmlContent) {
    return htmlContent.replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapButtonMjml(htmlContent) {
    return htmlContent.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, function (match, content) {
      return `
                       </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px; word-break:break-word;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                              <td class="btn-edit-p" height="51" align="center" style="border-radius: 10px;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;font-weight: bold; color: #FFFFFF; padding: 3px 5px; background-color: #28b628;" bgcolor="#28b628">
                                  <a href="urlhere" target="_blank" style="font-weight: bold;text-decoration:none;color:#ffffff;padding: 9px 15px;display: block;font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;line-height:1.5;text-align:center;background-color: #28b628;border-radius: 10px;">
                                       ${content}           
                                  </a>
                             </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapRightSideImgMjml(htmlContent) {
    return htmlContent.replace(/i-r-s([\s\S]*?)i-r-s-e/gi, function (match, content) {
      return `
                       </div>
                      </td>
                    </tr>
                    <tr>
                        <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <table class="content-inner-table" border="0" cellspacing="0" role="presentation"
                                   cellpadding="0" width="100%" style="width: 100%;">
                                <tr>
                                    <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 14px; padding-top: 14px;">
                                        <a align="right" href="urlhere" target="_blank" style="display: inline-block; float: right; width: 50%; max-width: 50%; margin-left: 18px; margin-bottom: 12px;">
                                            <img alt="Preview" height="224"
                                                 align="right"
                                                 src="https://storage.5th-elementagency.com/"
                                                 style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                                                 width="250"/>
                                        </a>
                                        <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                                        ${content}
                                      </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapLeftSideImgMjml(htmlContent) {
    return htmlContent.replace(/i-l-s([\s\S]*?)i-l-s-e/gi, function (match, content) {
      return `
                       </div>
                      </td>
                    </tr>
                    <tr>
                        <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <table class="content-inner-table" border="0" cellspacing="0" role="presentation"
                                   cellpadding="0" width="100%" style="width: 100%;">
                                      <tr>
                                        <td align="left" style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-bottom: 14px; padding-top: 14px;">
                                          <a align="left" href="urlhere" target="_blank" style="display: inline-block; float: left; width: 50%; max-width: 50%; margin-right: 18px; margin-bottom: 12px;">
                                            <img alt="Preview" height="224"
                                                 align="left"
                                                 src="https://storage.5th-elementagency.com/"
                                                 style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height: 224px;max-width: 100%; width: 100%;font-size:13px;object-fit: contain;"
                                                 width="250"/>
                                          </a>
                                          <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                                            ${content}
                                          </span>
                                        </td>
                                      </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapSignatureImgMjml(htmlContent) {
    return htmlContent.replace(/sign-i([\s\S]*?)sign-i-e/gi, function (match, content) {
      return `
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width:200px;">
                                <img alt="Signature" src="sign_url" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200" height="auto" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterBlockMjml(htmlContent) {
    return htmlContent.replace(/ftr-s([\s\S]*?)ftr-e/gi, function (match, content) {
      return `
                       </div>
                      </td>
                    </tr>
                      <tr>
                      <td align="left" style="font-size:0px;padding:30px 25px 10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  wrapFooterCenterBlockMjml(htmlContent) {
    return htmlContent.replace(/ftr-c([\s\S]*?)ftr-c-e/gi, function (match, content) {
      return `
                       </div>
                      </td>
                    </tr>
                      <tr>
                      <td align="center" style="font-size:0px;padding:30px 25px 10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:12px;font-style:normal;font-weight:normal;line-height:1.5;text-align:center;color:#000000;">
                            ${content}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        `
    })
  }

  // --- Очистка и списки ---
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

  wrapTextInSpan(htmlContent, promoName) {
    let currentImgIdx = 1
    let processed = htmlContent.replace(/<img[^>]*>/gi, (match) => {

      const altMatch = match.match(/alt=["']([^"']*)["']/i)
      const rawAlt = altMatch && altMatch[1] ? altMatch[1] : 'video'
      const imageAlt = rawAlt.replace(/"/g, '&quot;').trim()

      const dynamicSrc = this.generateDynamicImgSrc(currentImgIdx++, promoName, this.categoryName)

      return `</span></td></tr>
            <tr><td class="img-bg-block" align="center" style="padding-top: 14px; padding-bottom: 14px;">
                <a href="urlhere" target="_blank">
                    <img alt="${imageAlt}" height="auto"
                                    src="${dynamicSrc}"
                                    style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width: 560px;font-size:13px;"
                                    width="560"/>
                </a>
            </td></tr>
            <tr><td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                            <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">`
    })

    return `<tr>
    <td style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
      <span style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
        ${processed}
      </span>
    </td>
  </tr>`
  }

  wrapTextInMjmlTags(htmlContent, promoName) {
    let currentImgIdx = 1
    htmlContent = htmlContent.replace(/<img[^>]*>/gi, (match) => {

      const altMatch = match.match(/alt=["']([^"']*)["']/i)
      const rawAlt = altMatch && altMatch[1] ? altMatch[1] : 'video'
      const imageAlt = rawAlt.replace(/"/g, '&quot;').trim()

      const dynamicSrc = this.generateDynamicImgSrc(currentImgIdx++, promoName, this.categoryName)

      return `       </div>
                      </td>
                    </tr>
                   <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width:550px;">
                                <a href="urlhere" target="_blank">
                                  <img alt="${imageAlt}" src="${dynamicSrc}" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="550" height="auto" />
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                `
    })

    return `
            <tr>
              <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                <div style="font-family:'Roboto', Arial, Helvetica, sans-serif;font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${htmlContent}
                </div>
              </td>
            </tr>
        `
  }

  cleanEmptyHtmlTags(htmlContent) {
    htmlContent = htmlContent.replace(/&nbsp;/g, ' ')
    htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, '')
    htmlContent = htmlContent.replace(/<li>\s*<\/li>/g, '')
    htmlContent = htmlContent.replace(/<span[^>]*>(?!\s*ю\s*)[\s]*<\/span>/gi, '')
    htmlContent = htmlContent.replace(/<br>\s*<\/span>/g, '</span>')
    htmlContent = htmlContent.replace(/<br>\s*<br>\s*<br>\s*<br>/g, '<br><br>')
    htmlContent = htmlContent.replace(/<br>\s*<br>\s*<br>/g, '<br><br>')
    htmlContent = htmlContent.replace(/(?:\s*<br\s*\/?>\s*)+(?=<\/span>|(\s*<\/td>))/gi, '')
    htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<br><br>/gi, '$1')
    htmlContent = htmlContent.replace(/<\/a>\s*<a[^>]*>/g, ' ')
    htmlContent = htmlContent.replace(/<pre>/g, '')
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, ' ')
    htmlContent = htmlContent.replace(/<b[^>]*>\s*<\/b>/g, ' ')
    htmlContent = htmlContent.replace(/<u>\s*<\/u>/g, ' ')
    htmlContent = htmlContent.replace(/<em[^>]*>\s*<\/em>/g, ' ')
    htmlContent = htmlContent.replace(/<\/em>\s*<em[^>]*>/g, ' ')
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, ' ')
    htmlContent = htmlContent.replace(/<br><br>\s*<\/span>/g, '<\/span>')
    htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<\/a>/gi, '$1')
    htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<\/b>/gi, '$1')
    htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/span>/g, '<\/span>')
    htmlContent = htmlContent.replace(/<b[^>]*>\s*<\/span>/g, '<\/span>')
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
    htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<br><br>/gi, '$1')
    htmlContent = htmlContent.replace(/<br><br>\s*<\/span>/g, '<\/span>')
    htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<br><br>/gi, '$1')
    htmlContent = htmlContent.replace(/<br><br>\s*<\/div>/g, '<\/div>')
    htmlContent = htmlContent.replace(/<br>\s*<\/div>/g, '<\/div>')
    htmlContent = htmlContent.replace(/<br>\s*<\/span>/g, '<\/span>')

    htmlContent = htmlContent.replace(/<span[^>]*>\s*<\/span>/g, '')
    htmlContent = htmlContent.replace(/<div[^>]*>\s*<\/div>/g, '')
    htmlContent = htmlContent.replace(/<td[^>]*>\s*<\/td>/g, '')
    htmlContent = htmlContent.replace(/<tr[^>]*>\s*<\/tr>/g, '')
    htmlContent = htmlContent.replace(/(<span[^>]*>)\s*(?:<br\s*\/?>|ю|\s)+/gi, '$1')
    htmlContent = htmlContent.replace(/(<td[^>]*>)\s*(?:<br\s*\/?>|ю|\s)+/gi, '$1')

    return htmlContent
  }

  wrapContentInFullTableStructure(htmlContent) {
    return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 100%;">
        <tr>
            <td align="center" valign="top">
                <table class="primary-table-limit content-table" bgcolor="#FFFFFF" border="0" cellspacing="0"
                       cellpadding="0" role="presentation" width="100%" style="max-width: 600px;">
                    <tr>
                        <td class="content-vertical-space" align="center" style="padding-left: 20px; padding-right: 20px;">
                            <table class="content-inner-table" border="0" cellspacing="0" role="presentation"
                                   cellpadding="0" width="100%" style="width: 100%;">
                                <tr>
                                    <td height="16" width="100%" style="max-width: 100%" class="md-horizontal-space"></td>
                                </tr>
                                ${htmlContent}
                                <tr>
                                    <td height="16" width="100%" style="max-width: 100%" class="md-horizontal-space"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>`
  }

  wrapContentInFullMjmlTableStructure(htmlContent) {
    return `
    <div style="background-color:#FFFFFF;">
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="margin:0px auto;max-width:600px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                <tbody>
                <tr>
                    <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;width:600px;" ><![endif]-->
                        <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                                <tbody>
                                    ${htmlContent}
                                </tbody>
                            </table>
                        </div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <!--[if mso | IE]></td></tr></table><![endif]-->
    </div>`
  }

  // =========================================================
  //   ГЛАВНЫЕ МЕТОДЫ ГЕНЕРАЦИИ (Вызываются из React)
  // =========================================================

  async exportHTML(rawEditorContent, promoName) {
    let editorContent = rawEditorContent || ''

    editorContent = editorContent.replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, 'ю')
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
    editorContent = editorContent.replace(/(?:ю|\s|<br\s*\/?>)+(?=\s*<\/span>)/gi, '')
    editorContent = editorContent.replace(/(<span[^>]*>)\s*(?:ю|<br\s*\/?>|\s)+/gi, '$1')
    editorContent = this.cleanEmptyHtmlTags(editorContent)
    editorContent = this.wrapContentInFullTableStructure(editorContent)
    editorContent = this.addOneBr(editorContent)
    editorContent = this.replaceTripleBrWithSingle(editorContent)
    editorContent = editorContent.replace(/<\/tr>\s*<br\s*\/?>/gi, '</tr>')
    editorContent = editorContent.replace(/<\/td>\s*<br\s*\/?>/gi, '</td>')
    editorContent = editorContent.replace(/<\/span>\s*<br\s*\/?>/gi, '</span>')

    return await this.formatWithPrettier(editorContent)
  }

  async exportMJML(rawEditorContent, promoName) {
    let editorContent = rawEditorContent || ''

    editorContent = editorContent.replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, 'ю')
    editorContent = this.italicLinks(editorContent)
    editorContent = this.linksStyles(editorContent)
    editorContent = this.replaceAllEmojisAndSymbolsExcludingHTML(editorContent)
    editorContent = this.processStyles(editorContent)
    editorContent = this.wrapCenterTextMjml(editorContent)
    editorContent = this.wrapSmallCenterTextMjml(editorContent)
    editorContent = this.wrapSmallTextMjml(editorContent)
    editorContent = this.wrapCenterHeadlineMjml(editorContent)
    editorContent = this.wrapHeadlineMjml(editorContent)
    editorContent = this.wrapCenterQuoteMjml(editorContent)
    editorContent = this.wrapQuoteMjml(editorContent)
    editorContent = this.wrapButtonMjml(editorContent)
    editorContent = this.addBrAfterClosingP(editorContent)
    editorContent = this.removeStylesFromLists(editorContent)
    editorContent = this.wrapTextInMjmlTags(editorContent, promoName)
    editorContent = this.wrapLeftSideImgMjml(editorContent)
    editorContent = this.wrapRightSideImgMjml(editorContent)
    editorContent = this.wrapSignatureImgMjml(editorContent)
    editorContent = this.wrapFooterBlockMjml(editorContent)
    editorContent = this.wrapFooterCenterBlockMjml(editorContent)
    editorContent = editorContent.replace(/(?:ю|\s|<br\s*\/?>)+(?=\s*<\/div>)/gi, '')
    editorContent = editorContent.replace(/(<div[^>]*>)\s*(?:ю|<br\s*\/?>|\s)+/gi, '$1')
    editorContent = this.cleanEmptyHtmlTags(editorContent)
    editorContent = this.wrapContentInFullMjmlTableStructure(editorContent)
    editorContent = this.addOneBr(editorContent)
    editorContent = this.replaceTripleBrWithSingle(editorContent)
    editorContent = editorContent.replace(/<\/div>\s*<br\s*\/?>/gi, '</div>')
    editorContent = editorContent.replace(/<\/td>\s*<br\s*\/?>/gi, '</td>')

    return await this.formatWithPrettier(editorContent)
  }
}

const financeProcessorInstance = new FinanceProcessor()
export default financeProcessorInstance