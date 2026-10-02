import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'
import type { SignInOptions } from '#/server/auth/auth.functions'

// A minimal sign-in page; task 012 gives it the app's look, and task 010 its translations.
export function SignInPage({
  options,
  onSignedIn,
}: {
  options: SignInOptions
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
      <h1 className="text-2xl font-semibold">Sign in to snowprofile</h1>

      {options.demo && (
        <section className="rounded-md border p-4 text-sm" aria-label="Demo version">
          <p className="font-medium">Demo version: all data is fictional.</p>
          <p className="mt-2">
            Sign in as {options.demo.emails.join(' or ')} with the password{' '}
            <code>{options.demo.password}</code>.
          </p>
        </section>
      )}

      {options.methods.includes('password') ? (
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
                <Label htmlFor={field.name}>Email</Label>
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
                <Label htmlFor={field.name}>Password</Label>
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
          {failed && <p role="alert">Wrong email or password.</p>}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                Sign in
              </Button>
            )}
          </form.Subscribe>
        </form>
      ) : (
        <p>No sign-in method is configured yet.</p>
      )}
    </main>
  )
}

export function SignInPending() {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-semibold">Sign in to snowprofile</h1>
    </main>
  )
}
