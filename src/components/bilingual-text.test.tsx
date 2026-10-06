import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BilingualText } from './bilingual-text'

describe('BilingualText', () => {
  it('shows the text in the UI language', () => {
    render(<BilingualText value={{ et: 'Arendaja', en: 'Developer' }} />)

    expect(screen.getByText('Developer')).toHaveAttribute('lang', 'en')
    expect(screen.queryByText('Arendaja')).not.toBeInTheDocument()
  })

  it('bilingual-content.fallback-marked: shows the other language, marked as missing', () => {
    render(<BilingualText value={{ et: 'Arendaja', en: null }} />)

    expect(screen.getByText('Arendaja')).toHaveAttribute('lang', 'et')
    expect(screen.getByText('No English')).toBeInTheDocument()
  })

  it('bilingual-content.none-set: shows a text in neither language as not added', () => {
    render(<BilingualText value={{ et: null, en: null }} />)

    expect(screen.getByText('Not added')).toBeInTheDocument()
  })
})
