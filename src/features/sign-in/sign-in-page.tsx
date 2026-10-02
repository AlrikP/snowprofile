import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { LanguageSwitch } from '#/components/language-switch'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'
import type { SignInOptions } from '#/server/auth/auth.functions'

// A minimal sign-in page; task 012 gives it the app's look.
// The error codes Better Auth sends back after a refused Google sign-in.
function signInErrorMessage(code: string) {
  if (code.toUpperCase() === 'LOGIN_DOMAIN_NOT_ALLOWED') return m.sign_in_error_domain()
  return m.sign_in_error_other({ code })
}

export function SignInPage({
  options,
  initialError,
  onSignedIn,
}: {
  options: SignInOptions
  initialError?: string
  onSignedIn: () => void
}) {
  const [failed, setFailed] = useState(false)
  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email(value)
      setFailed(Boolean(error))
      if (!error) onSignedIn()
    },
  })

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{m.sign_in_title()}</h1>
      <LanguageSwitch />

      {options.demo && (
        <section className="rounded-md border p-4 text-sm" aria-label={m.sign_in_demo_label()}>
          <p className="font-medium">{m.sign_in_demo_notice()}</p>
          <p className="mt-2">
            {m.sign_in_demo_accounts({
              emails: options.demo.emails.join(` ${m.sign_in_demo_accounts_or()} `),
            })}{' '}
            <code>{options.demo.password}</code>.
          </p>
        </section>
      )}

      {initialError && <p role="alert">{signInErrorMessage(initialError)}</p>}

      {options.methods.includes('google') && (
        <Button
          onClick={() =>
            void authClient.signIn.social({
              provider: 'google',
              callbackURL: '/',
              errorCallbackURL: '/sign-in',
            })
          }
        >
          {m.sign_in_google()}
        </Button>
      )}

      {options.methods.includes('password') && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{m.sign_in_email()}</Label>
                <Input
                  id={field.name}
                  type="email"
                  autoComplete="username"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{m.sign_in_password()}</Label>
                <Input
                  id={field.name}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          {failed && <p role="alert">{m.sign_in_wrong_password()}</p>}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {m.sign_in_submit()}
              </Button>
            )}
          </form.Subscribe>
        </form>
      )}

      {options.methods.length === 0 && <p>{m.sign_in_no_methods()}</p>}
    </main>
  )
}

export function SignInPending() {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-semibold">{m.sign_in_title()}</h1>
    </main>
  )
}
