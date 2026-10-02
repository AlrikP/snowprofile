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
    customers: r.many.customer(),
    projects: r.many.project(),
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
    projects: r.many.projectTechnology(),
  },
  tenderCriterion: {
    organization: r.one.organization({
      from: r.tenderCriterion.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    answers: r.many.projectCriterionAnswer(),
  },
  customer: {
    organization: r.one.organization({
      from: r.customer.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    contactPersons: r.many.contactPerson(),
    projects: r.many.project(),
  },
  contactPerson: {
    customer: r.one.customer({
      from: r.contactPerson.customerId,
      to: r.customer.id,
      optional: false,
    }),
    projects: r.many.projectContact(),
  },
  project: {
    organization: r.one.organization({
      from: r.project.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    customer: r.one.customer({ from: r.project.customerId, to: r.customer.id }),
    contacts: r.many.projectContact(),
    technologies: r.many.projectTechnology(),
    answers: r.many.projectCriterionAnswer(),
  },
  projectContact: {
    project: r.one.project({
      from: r.projectContact.projectId,
      to: r.project.id,
      optional: false,
    }),
    contactPerson: r.one.contactPerson({
      from: r.projectContact.contactPersonId,
      to: r.contactPerson.id,
      optional: false,
    }),
  },
  projectTechnology: {
    project: r.one.project({
      from: r.projectTechnology.projectId,
      to: r.project.id,
      optional: false,
    }),
    technology: r.one.technology({
      from: r.projectTechnology.technologyId,
      to: r.technology.id,
      optional: false,
    }),
  },
  projectCriterionAnswer: {
    project: r.one.project({
      from: r.projectCriterionAnswer.projectId,
      to: r.project.id,
      optional: false,
    }),
    criterion: r.one.tenderCriterion({
      from: r.projectCriterionAnswer.criterionId,
      to: r.tenderCriterion.id,
      optional: false,
    }),
  },
}))
