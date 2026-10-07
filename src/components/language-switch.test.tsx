import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '#/server/errors'
import { LanguageSwitch } from './language-switch'

describe('LanguageSwitch', () => {
  it('ui-languages.save-failed: shows why a failed save kept the language', async () => {
    const save = vi.fn().mockRejectedValue(new AppError('UNAUTHENTICATED', 'sign_in_required'))
    render(<LanguageSwitch save={save} />)

    await userEvent.click(screen.getByRole('button', { name: 'Eesti' }))

    expect(save).toHaveBeenCalledWith('et')
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in first.')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  })
})
