// Relations for Drizzle's relational queries, which Better Auth's adapter uses. Query-layer
// config only: the foreign keys live in the migrations and schema.ts.
import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    memberships: r.many.member(),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id, optional: false }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id, optional: false }),
  },
  organization: {
    members: r.many.member(),
    invitations: r.many.invitation(),
    technologyCategories: r.many.technologyCategory(),
    technologies: r.many.technology(),
    tenderCriteria: r.many.tenderCriterion(),
  },
  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    user: r.one.user({ from: r.member.userId, to: r.user.id, optional: false }),
  },
  invitation: {
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    inviter: r.one.user({ from: r.invitation.inviterId, to: r.user.id, optional: false }),
  },
  technologyCategory: {
    organization: r.one.organization({
      from: r.technologyCategory.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    technologies: r.many.technology(),
  },
  technology: {
    organization: r.one.organization({
      from: r.technology.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    category: r.one.technologyCategory({
      from: r.technology.categoryId,
      to: r.technologyCategory.id,
      optional: false,
    }),
    mergedInto: r.one.technology({ from: r.technology.mergedIntoId, to: r.technology.id }),
  },
  tenderCriterion: {
    organization: r.one.organization({
      from: r.tenderCriterion.organizationId,
      to: r.organization.id,
      optional: false,
    }),
  },
}))
