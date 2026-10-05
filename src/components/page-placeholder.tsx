import { m } from '#/paraglide/messages.js'

// A menu destination whose feature isn't built yet; its feature task replaces the route's
// component.
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <main className="flex flex-1 flex-col gap-2 p-4 md:p-8">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-muted-foreground">{m.page_not_built()}</p>
    </main>
  )
}
