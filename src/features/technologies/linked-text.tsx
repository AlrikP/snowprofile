import { Fragment, type ReactNode } from 'react'

// https:// URLs in plain text, up to whitespace. Only https: a note can't carry a
// javascript: or data: link, because nothing else becomes one.
const URL_PATTERN = /https:\/\/[^\s<>"]+/g
// Punctuation that usually ends the sentence around a URL rather than the URL itself.
const TRAILING = /[.,;:!?)\]'"]+$/

// Plain text with its https links clickable, keeping its line breaks.
export function LinkedText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING, '')
    const start = match.index
    parts.push(text.slice(last, start))
    parts.push(
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground break-words underline underline-offset-2"
      >
        {url}
      </a>,
    )
    last = start + url.length
  }
  parts.push(text.slice(last))
  return (
    <p className={`whitespace-pre-line ${className ?? ''}`}>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </p>
  )
}
