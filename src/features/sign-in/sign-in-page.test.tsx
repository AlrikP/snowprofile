import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SignInPage } from './sign-in-page'

describe('SignInPage', () => {
  it('shows the demo notice with the seeded accounts in demo mode', () => {
    render(
      <SignInPage
        options={{
          methods: ['password'],
          demo: { password: 'secret-demo', emails: ['admin@demo.example.com'] },
        }}
        onSignedIn={() => {}}
      />,
    )

    expect(screen.getByRole('region', { name: 'Demo version' })).toHaveTextContent(
      'admin@demo.example.com',
    )
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows no demo notice and no password form outside demo mode', () => {
    render(<SignInPage options={{ methods: [], demo: null }} onSignedIn={() => {}} />)

    expect(screen.queryByRole('region', { name: 'Demo version' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })
})
