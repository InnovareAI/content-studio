'use client'

import { clean } from '@/lib/exportDoc'
import { markdownToText } from '@/lib/mdToText'

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 48
const FONT_SIZE = 11
const LINE_HEIGHT = 15
const MAX_CHARS = 88

function filename(): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  return `vera-${stamp}.pdf`
}

function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '')
    .replace(/\t/g, '  ')
}

function wrapLine(line: string): string[] {
  if (!line.trim()) return ['']
  const words = line.split(/\s+/)
  const out: string[] = []
  let current = ''

  for (const word of words) {
    if (word.length > MAX_CHARS) {
      if (current) out.push(current)
      for (let i = 0; i < word.length; i += MAX_CHARS) out.push(word.slice(i, i + MAX_CHARS))
      current = ''
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (next.length > MAX_CHARS) {
      out.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) out.push(current)
  return out
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function paginate(lines: string[]): string[][] {
  const perPage = Math.max(1, Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT))
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage))
  return pages.length ? pages : [['']]
}

function contentStream(lines: string[]): string {
  const escaped = lines.map(line => line ? `(${pdfEscape(line)}) Tj T*` : 'T*').join('\n')
  return `BT\n/F1 ${FONT_SIZE} Tf\n${LINE_HEIGHT} TL\n${MARGIN} ${PAGE_HEIGHT - MARGIN} Td\n${escaped}\nET`
}

function buildPdf(lines: string[]): string {
  const pages = paginate(lines)
  const fontId = 1
  const pagesId = 2
  const catalogId = 3 + pages.length * 2
  const objects = new Map<number, string>()
  const kids: number[] = []

  objects.set(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    const stream = contentStream(pageLines)
    kids.push(pageId)
    objects.set(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  objects.set(pagesId, `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  let pdf = '%PDF-1.4\n'
  const offsets = new Map<number, number>()
  for (let id = 1; id <= catalogId; id += 1) {
    const body = objects.get(id)
    if (!body) continue
    offsets.set(id, pdf.length)
    pdf += `${id} 0 obj\n${body}\nendobj\n`
  }

  const xrefAt = pdf.length
  pdf += `xref\n0 ${catalogId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= catalogId; id += 1) {
    pdf += `${String(offsets.get(id) ?? 0).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return pdf
}

export async function downloadPdf(content: string, images: string[] = [], videos: string[] = []): Promise<void> {
  const lines = normalizeText(markdownToText(clean(content)))
    .split('\n')
    .flatMap(wrapLine)

  if (images.length) {
    lines.push('', 'Images:')
    images.forEach((url, index) => lines.push(...wrapLine(`${index + 1}. ${url}`)))
  }
  if (videos.length) {
    lines.push('', 'Videos:')
    videos.forEach((url, index) => lines.push(...wrapLine(`${index + 1}. ${url}`)))
  }

  const blob = new Blob([buildPdf(lines)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
