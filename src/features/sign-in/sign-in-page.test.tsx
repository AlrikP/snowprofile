import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SignInPage } from './sign-in-page'

describe('SignInPage', () => {
  it('sign-in.demo-accounts-listed: shows the demo notice with the seeded accounts in demo mode', () => {
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

  it('sign-in.no-demo-form-outside-demo: shows no demo notice and no password form outside demo mode', () => {
    render(<SignInPage options={{ methods: [], demo: null }} onSignedIn={() => {}} />)

    expect(screen.queryByRole('region', { name: 'Demo version' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('sign-in.google-offered: offers Google sign-in when it is configured', () => {
    render(<SignInPage options={{ methods: ['google'], demo: null }} onSignedIn={() => {}} />)

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  it('sign-in.domain-error-explained: explains a refused login domain', () => {
    render(
      <SignInPage
        options={{ methods: ['google'], demo: null }}
        initialError="LOGIN_DOMAIN_NOT_ALLOWED"
        onSignedIn={() => {}}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('email domain')
  })
})
