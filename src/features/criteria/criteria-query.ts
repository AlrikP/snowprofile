import { queryOptions } from '@tanstack/react-query'
import { type Bilingual, bilingualDisplay } from '#/lib/bilingual'
import { getLocale } from '#/paraglide/runtime.js'
import { type Criterion, getCriteria } from '#/server/criteria/criteria.functions'

export type { Criterion }

export function criteriaQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['criteria', organizationId],
    queryFn: () => getCriteria({ data: { organizationId } }),
  })
}

export function criterionName(criterion: Criterion): Bilingual {
  return { et: criterion.nameEt, en: criterion.nameEn }
}

// The name in the UI language, or the other one, for labels and titles.
export function criterionLabel(criterion: Criterion): string {
  return bilingualDisplay(criterionName(criterion), getLocale())?.text ?? ''
}
