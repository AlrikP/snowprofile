import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '#/components/ui/card'

// One card of the project form, named by its heading.
export function FormSection({
  id,
  title,
  hint,
  action,
  children,
}: {
  id: string
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        {hint && <CardDescription>{hint}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}
