import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db'
import { auth } from '#/server/auth/better-auth.server'
import { cvDocumentResponse } from '#/server/cvs/cv-document.server'

// The CV page's "Download DOCX" link (cvDocumentHref).
export const Route = createFileRoute('/api/cv-document')({
  server: {
    handlers: {
      GET: ({ request }) => cvDocumentResponse(db, auth, request),
    },
  },
})
