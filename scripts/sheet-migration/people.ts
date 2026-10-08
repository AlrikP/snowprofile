// Loads the employee sheets into an organization: a user per company email, the profile,
// education, participations with their roles, and own projects (docs/architecture.md, "From
// the sheet"). Runs inside the migration's transaction, after the projects. A person is
// matched by email, so the same user signs in with Google later and finds this profile;
// a re-run finds the rest by what identifies it on the sheet, and adds nothing twice.
import { and, eq, gt } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Executor } from '#/db'
import { SYSTEM_USER_ID } from '#/db/actor'
import {
  education,
  employeeProfile,
  invitation,
  member,
  ownProject,
  ownProjectRole,
  ownProjectTechnology,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectTechnology,
  user,
} from '#/db/schema'
import { normalizeName } from '#/lib/normalize-name'
import { endsBeforeStart, outsidePeriod } from '#/lib/period'
import { INVITATION_DAYS } from '#/server/invitations/invitations.server'
import type { Catalogues } from './catalogue'
import type { SheetPerson } from './read'
import type { Report } from './report'

type Counts = { added: number; updated: number }

export type PeopleLoaded = {
  users: number
  profiles: Counts
  invitations: number
  education: Counts
  participations: Counts
  ownProjects: Counts
}

type Person = SheetPerson & { email: string }

function counts(): Counts {
  return { added: 0, updated: 0 }
}

export async function loadPeople(
  tx: Executor,
  organizationId: string,
  people: SheetPerson[],
  catalogue: Catalogues,
  report: Report,
  now = new Date(),
): Promise<PeopleLoaded> {
  const loaded: PeopleLoaded = {
    users: 0,
    profiles: counts(),
    invitations: 0,
    education: counts(),
    participations: counts(),
    ownProjects: counts(),
  }
  // The organization's live projects, which participations refer to by sheet number or
  // by name.
  const projects = await tx
    .select({
      id: project.id,
      importRef: project.importRef,
      normalizedName: project.normalizedName,
      startDate: project.startDate,
      endDate: project.endDate,
    })
    .from(project)
    .where(and(eq(project.organizationId, organizationId), eq(project.sysDeleted, false)))

  // Someone without a company email is already in the reader's report.
  for (const person of people.filter((each): each is Person => each.email !== null)) {
    const userId = await userFor(person)
    const profileId = await profileFor(person, userId)
    await invite(person.email, userId)
    await loadEducation(person, profileId)
    await loadParticipations(person, profileId)
    await loadOwnProjects(person, profileId)
  }
  return loaded

  // The user with this email, or a new one with no linked account. The company vouches
  // for its own addresses, so the email counts as verified: Better Auth then links a
  // Google sign-in at that address to this user.
  async function userFor(person: Person) {
    const [found] = await tx.select({ id: user.id }).from(user).where(eq(user.email, person.email))
    if (found) return found.id
    const id = uuidv7()
    await tx.insert(user).values({
      id,
      name: person.fullName,
      email: person.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    loaded.users++
    return id
  }

  async function profileFor(person: Person, userId: string) {
    const values = {
      fullName: person.fullName,
      ...(person.birthDate && { birthDate: person.birthDate }),
      ...(person.joinDate && { joinDate: person.joinDate }),
    }
    const [found] = await tx
      .select({ id: employeeProfile.id })
      .from(employeeProfile)
      .where(
        and(eq(employeeProfile.organizationId, organizationId), eq(employeeProfile.userId, userId)),
      )
    if (found) {
      await tx.update(employeeProfile).set(values).where(eq(employeeProfile.id, found.id))
      loaded.profiles.updated++
      return found.id
    }
    const id = uuidv7()
    await tx.insert(employeeProfile).values({ id, organizationId, userId, ...values })
    loaded.profiles.added++
    return id
  }

  // An employee invitation, unless they are a member or one is still pending. Accepting it
  // keeps this profile (insertMembership in the invitations repository).
  async function invite(email: string, userId: string) {
    const [isMember] = await tx
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    if (isMember) return
    const [pending] = await tx
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.email, email),
          eq(invitation.status, 'pending'),
          gt(invitation.expiresAt, now),
        ),
      )
    if (pending) return
    await tx.insert(invitation).values({
      id: uuidv7(),
      organizationId,
      email,
      role: 'employee',
      status: 'pending',
      expiresAt: new Date(now.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
      inviterId: SYSTEM_USER_ID,
      createdAt: now,
    })
    loaded.invitations++
  }

  // Matched by institution and field.
  async function loadEducation(person: Person, profileId: string) {
    const stored = await tx
      .select({ id: education.id, institution: education.institutionEt, field: education.fieldEt })
      .from(education)
      .where(and(eq(education.profileId, profileId), eq(education.sysDeleted, false)))
    function key(institution: string | null, field: string | null) {
      return `${normalizeName(institution ?? '')}|${normalizeName(field ?? '')}`
    }
    for (const entry of person.education) {
      const values = {
        institutionEt: entry.institution,
        fieldEt: entry.field,
        degreeEt: entry.degree,
        startDate: entry.period?.startDate ?? null,
        endDate: entry.period?.endDate ?? null,
      }
      const found = stored.find(
        (each) => key(each.institution, each.field) === key(entry.institution, entry.field),
      )
      if (found) {
        await tx.update(education).set(values).where(eq(education.id, found.id))
        loaded.education.updated++
      } else {
        const id = uuidv7()
        await tx.insert(education).values({ id, organizationId, profileId, ...values })
        stored.push({ id, institution: entry.institution, field: entry.field })
        loaded.education.added++
      }
    }
  }

  // Matched by project and start, since a person can work on one project in several
  // periods.
  async function loadParticipations(person: Person, profileId: string) {
    const stored = await tx
      .select({
        id: participation.id,
        projectId: participation.projectId,
        startDate: participation.startDate,
      })
      .from(participation)
      .where(and(eq(participation.profileId, profileId), eq(participation.sysDeleted, false)))
    for (const work of person.participations) {
      function flag(reason: string) {
        report.add({ sheet: person.sheet, cell: work.cell, value: refText(work.project), reason })
      }
      const matches = projects.filter((each) =>
        'number' in work.project
          ? each.importRef === String(work.project.number)
          : each.normalizedName === work.project.normalizedName,
      )
      const onProject = matches.length === 1 ? matches[0] : undefined
      if (!onProject) {
        flag(
          matches.length === 0
            ? 'Not loaded: no project with this number or name.'
            : 'Not loaded: several projects have this name; use the project number.',
        )
        continue
      }
      if (!work.period) {
        flag('Not loaded: the participation needs a readable start date.')
        continue
      }
      // Loaded as the sheet has it, for the person to fix. Ongoing work on a project that
      // ended after the work started reads as ending with it (participationEndDate), so
      // only ongoing work that starts after its project ended is flagged.
      const outside = outsidePeriod(work.period, onProject)
      const startsAfterProjectEnded =
        onProject.endDate !== null && endsBeforeStart(work.period.startDate, onProject.endDate)
      if (
        outside.start ||
        outside.end === 'after_outer_end' ||
        (outside.end === 'ongoing_after_outer_end' && startsAfterProjectEnded)
      ) {
        flag('Outside the project’s period; fix it in the app.')
      }
      if (work.roles.length === 0) flag('No role; add one in the app.')

      const values = {
        endDate: work.period.endDate,
        hours: work.hours?.value ?? null,
        hoursQualifier: work.hours?.qualifier ?? null,
        tasksEt: work.tasks,
      }
      const found = stored.find(
        (each) => each.projectId === onProject.id && each.startDate === work.period?.startDate,
      )
      let participationId = found?.id
      if (participationId) {
        await tx.update(participation).set(values).where(eq(participation.id, participationId))
        loaded.participations.updated++
      } else {
        participationId = uuidv7()
        await tx.insert(participation).values({
          id: participationId,
          organizationId,
          profileId,
          projectId: onProject.id,
          startDate: work.period.startDate,
          ...values,
        })
        stored.push({
          id: participationId,
          projectId: onProject.id,
          startDate: work.period.startDate,
        })
        loaded.participations.added++
        // A new participation starts with the project's technologies, as in the app
        // (docs/product.md, "Technologies on projects and participations").
        const technologies = await tx
          .select({ technologyId: projectTechnology.technologyId })
          .from(projectTechnology)
          .where(eq(projectTechnology.projectId, onProject.id))
        for (const { technologyId } of technologies) {
          await tx
            .insert(participationTechnology)
            .values({ participationId, technologyId, organizationId })
            .onConflictDoNothing()
        }
      }
      for (const name of work.roles) {
        await tx
          .insert(participationRole)
          .values({ participationId, roleId: await catalogue.role(name), organizationId })
          .onConflictDoNothing()
      }
    }
  }

  // Matched by name and start. The sheet has no roles for own projects, and their
  // characteristic answers and contact persons have no place in the data model.
  async function loadOwnProjects(person: Person, profileId: string) {
    const stored = await tx
      .select({ id: ownProject.id, name: ownProject.name, startDate: ownProject.startDate })
      .from(ownProject)
      .where(and(eq(ownProject.profileId, profileId), eq(ownProject.sysDeleted, false)))
    for (const own of person.ownProjects) {
      function flag(reason: string) {
        report.add({ sheet: person.sheet, cell: own.cell, value: own.name, reason })
      }
      if (!own.period) {
        flag('Not loaded: the own project needs a readable start date.')
        continue
      }
      const values = {
        name: own.name,
        customerName: own.customer,
        descriptionEt: own.description,
        startDate: own.period.startDate,
        endDate: own.period.endDate,
        tenderReference: own.tenderReference,
        totalHours: own.totalHours?.value ?? null,
        totalHoursQualifier: own.totalHours?.qualifier ?? null,
        hours: own.hours?.value ?? null,
        hoursQualifier: own.hours?.qualifier ?? null,
      }
      const found = stored.find(
        (each) =>
          normalizeName(each.name) === normalizeName(own.name) &&
          each.startDate === own.period?.startDate,
      )
      let ownProjectId = found?.id
      if (ownProjectId) {
        await tx.update(ownProject).set(values).where(eq(ownProject.id, ownProjectId))
        loaded.ownProjects.updated++
      } else {
        ownProjectId = uuidv7()
        await tx
          .insert(ownProject)
          .values({ id: ownProjectId, organizationId, profileId, ...values })
        stored.push({ id: ownProjectId, name: own.name, startDate: own.period.startDate })
        loaded.ownProjects.added++
      }
      const [hasRole] = await tx
        .select({ roleId: ownProjectRole.roleId })
        .from(ownProjectRole)
        .where(eq(ownProjectRole.ownProjectId, ownProjectId))
      if (!hasRole) flag('No role; add one in the app.')
      for (const sheetTechnology of own.technologies) {
        await tx
          .insert(ownProjectTechnology)
          .values({
            ownProjectId,
            technologyId: await catalogue.technology(sheetTechnology),
            organizationId,
          })
          .onConflictDoNothing()
      }
    }
  }
}

function refText(ref: SheetPerson['participations'][number]['project']) {
  return 'number' in ref ? `Projekt${ref.number}` : ref.name
}
