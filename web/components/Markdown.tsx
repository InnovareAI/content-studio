'use client'

import type { CSSProperties, ReactNode } from 'react'
import { color, space, type as t, radius } from '@/design'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const heading = (size: number): CSSProperties => ({
  fontFamily: t.family.sans,
  fontWeight: t.weight.semibold,
  lineHeight: 1.25,
  color: color.ink,
  margin: `${space[4]} 0 ${space[2]}`,
  fontSize: size,
})

function unwrapWholeFence(src: string): string {
  const s = src.trim()
  const match = s.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/)
  return match && !match[1].includes('```') ? match[1] : src
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${match.index}`

    if (token.startsWith('**')) {
      out.push(<strong key={key} style={{ fontWeight: t.weight.semibold }}>{inline(token.slice(2, -2), `${key}-b`)}</strong>)
    } else if (token.startsWith('`')) {
      out.push(<code key={key} style={{ fontFamily: MONO, fontSize: '0.88em', background: color.paper2, padding: '1px 5px', borderRadius: radius.sm }}>{token.slice(1, -1)}</code>)
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (link) {
        out.push(<a key={key} href={link[2]} target="_blank" rel="noreferrer" style={{ color: color.accent, textDecoration: 'underline' }}>{link[1]}</a>)
      } else {
        out.push(token)
      }
    }
    cursor = match.index + token.length
  }

  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function parseCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function renderBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }

    if (line.startsWith('```')) {
      const code: string[] = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(
        <pre key={`code-${i}`} style={{ margin: `0 0 ${space[3]}`, padding: space[3], background: color.paper2, border: `1px solid ${color.line}`, borderRadius: radius.md, overflowX: 'auto', fontSize: t.size.cap, lineHeight: 1.5 }}>
          <code style={{ fontFamily: MONO }}>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const sizes = [20, 17, 15, 14]
      const content = inline(headingMatch[2], `h-${i}`)
      if (level === 1) blocks.push(<h1 key={`h-${i}`} style={heading(sizes[0])}>{content}</h1>)
      else if (level === 2) blocks.push(<h2 key={`h-${i}`} style={heading(sizes[1])}>{content}</h2>)
      else if (level === 3) blocks.push(<h3 key={`h-${i}`} style={heading(sizes[2])}>{content}</h3>)
      else blocks.push(<h4 key={`h-${i}`} style={heading(sizes[3])}>{content}</h4>)
      i += 1
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: `1px solid ${color.line}`, margin: `${space[4]} 0` }} />)
      i += 1
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseCells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(parseCells(lines[i]))
        i += 1
      }
      blocks.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: `0 0 ${space[3]}` }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: t.size.cap }}>
            <thead>
              <tr>{header.map((cell, idx) => <th key={idx} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `2px solid ${color.line}`, fontWeight: t.weight.semibold, background: color.paper2, whiteSpace: 'nowrap' }}>{inline(cell, `th-${i}-${idx}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>{row.map((cell, cellIdx) => <td key={cellIdx} style={{ padding: '6px 10px', borderBottom: `1px solid ${color.line}`, verticalAlign: 'top' }}>{inline(cell, `td-${i}-${rowIdx}-${cellIdx}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2])
      const items: string[] = []
      while (i < lines.length) {
        const item = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
        if (!item || /\d+\./.test(item[2]) !== ordered) break
        items.push(item[3])
        i += 1
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={`list-${i}`} style={{ margin: `0 0 ${space[3]}`, paddingLeft: 22 }}>
          {items.map((item, idx) => <li key={idx} style={{ margin: '2px 0' }}>{inline(item, `li-${i}-${idx}`)}</li>)}
        </Tag>,
      )
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      blocks.push(<blockquote key={`quote-${i}`} style={{ margin: `0 0 ${space[3]}`, padding: `2px 0 2px ${space[4]}`, borderLeft: `3px solid ${color.line2}`, color: color.ink2 }}>{inline(quoted.join('\n'), `q-${i}`)}</blockquote>)
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('```') && !/^(#{1,4})\s+/.test(lines[i]) && !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]) && !/^\s*>\s?/.test(lines[i])) {
      para.push(lines[i])
      i += 1
    }
    blocks.push(<p key={`p-${i}`} style={{ margin: `0 0 ${space[3]}`, whiteSpace: 'pre-wrap' }}>{inline(para.join('\n'), `p-${i}`)}</p>)
  }

  return blocks
}

export default function Markdown({ content }: { content: string }): ReactNode {
  return (
    <div style={{ fontSize: t.size.lg, lineHeight: 1.6, color: color.ink }}>
      {renderBlocks(unwrapWholeFence(content))}
    </div>
  )
}
