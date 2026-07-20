import prettier from 'prettier/standalone'
import parserHtml from 'prettier/plugins/html'

export async function formatWithPrettier(htmlString) {
  try {
    let formatted = await prettier.format(htmlString, {
      parser: "html",
      plugins: [parserHtml],
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      singleAttributePerLine: false,
      bracketSameLine: true,
      htmlWhitespaceSensitivity: "ignore",
    })

    formatted = formatted.trim()
    formatted = formatted.replace(/(<[a-z0-9]+)\s+([^>]+?)\s*>/gi, (match, tag, attrs) => {
      const cleanAttrs = attrs.replace(/\s+/g, ' ').trim()
      return `${tag} ${cleanAttrs}>`
    })
    return formatted
  } catch (e) {
    console.error("Prettier error:", e)
    return htmlString
  }
}