import { queryOptions } from '@tanstack/react-query'
import { getCv } from '#/server/cvs/cvs.functions'
import type { CvInput } from '#/server/cvs/cvs.schemas'

export function cvQuery(organizationId: string, input: CvInput) {
  return queryOptions({
    queryKey: ['cv', organizationId, input],
    queryFn: () => getCv({ data: { organizationId, ...input } }),
  })
}
