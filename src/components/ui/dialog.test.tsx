import { render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime.js'
import { Dialog, DialogContent, DialogTitle } from './dialog'

afterEach(() => overwriteGetLocale(() => 'en'))

it('labels the close button in the UI language', () => {
  overwriteGetLocale(() => 'et')
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Pealkiri</DialogTitle>
      </DialogContent>
    </Dialog>,
  )

  expect(screen.getByRole('button', { name: 'Sulge' })).toBeInTheDocument()
})
