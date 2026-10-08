import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime.js'
import { Dialog, DialogClose, DialogContent, DialogTitle } from './dialog'

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

describe('discarding changes', () => {
  function Form() {
    const [open, setOpen] = useState(true)
    return open ? (
      <Dialog open onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Own project</DialogTitle>
          <input aria-label="Name" />
          <button type="button" aria-label="Remove React" />
          <DialogClose asChild>
            <button type="button">Cancel</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    ) : (
      <p>Closed</p>
    )
  }

  it('closes on Esc at once while nothing has changed', async () => {
    render(<Form />)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('asks on Esc after typing, and keeps editing on "Keep editing" or a second Esc', async () => {
    render(<Form />)
    await userEvent.type(screen.getByLabelText('Name'), 'Portal')

    await userEvent.keyboard('{Escape}')
    const confirm = screen.getByRole('alertdialog', { name: 'Discard your changes?' })
    expect(within(confirm).getByRole('button', { name: 'Keep editing' })).toHaveFocus()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Portal')

    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Portal')
  })

  it('discards and closes on "Discard"', async () => {
    render(<Form />)
    await userEvent.type(screen.getByLabelText('Name'), 'Portal')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('asks after a button change, such as removing a picked entry', async () => {
    render(<Form />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('closes on Cancel at once, changed or not', async () => {
    render(<Form />)
    await userEvent.type(screen.getByLabelText('Name'), 'Portal')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })
})
