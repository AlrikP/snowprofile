// Rules for profiles. Server functions call these with the request's scope; tests call them
// with a test database.
import { v7 as uuidv7 } from 'uuid'
import type { Database, Executor } from '#/db'
import { findName } from '../account/account.repository.server'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './profiles.repository.server'
import type {
  AddEducationInput,
  DeleteEducationInput,
  PersonalDetailsInput,
  RequestProfileUpdateInput,
  UpdateEducationInput,
} from './profiles.schemas'

// An admin asks an employee to bring their profile up to date. A profile has at most one
// open request; the employee closes it by confirming the profile.
export async function requestProfileUpdate(
  db: Database,
  scope: Scope,
  input: RequestProfileUpdateInput,
) {
  requirePermission(scope, { profile: ['requestUpdate'] }, 'update_request_forbidden')
  // One transaction, so two admins asking at once can't both pass the open-request check.
  await db.transaction(async (tx) => {
    const profile = await repository.findProfile(tx, scope, input.profileId)
    if (!profile) throw new AppError('NOT_FOUND', 'profile_not_found')
    if (profile.leftDate) throw new AppError('INVALID', 'profile_left')
    if (await repository.hasOpenUpdateRequest(tx, scope, input.profileId)) {
      throw new AppError('CONFLICT', 'update_request_open')
    }
    await repository.insertUpdateRequest(tx, scope, input)
  })
  return { id: input.id }
}

// The signed-in member's own profile (docs/product.md, "Employee profile"). Every function
// below works on the session user's profile in the scope's organization; none takes a
// profile from the input, so nobody edits another person's profile through them.

// A member without a profile yet, such as one added before invitations created profiles,
// gets an empty one named after their account; the first save stores it.
export async function myProfile(db: Database, scope: Scope) {
  const profile = await repository.findOwnProfile(db, scope)
  const [entries, openRequest] = profile
    ? await Promise.all([
        repository.listEducation(db, scope, profile.id),
        repository.findOpenRequest(db, scope, profile.id),
      ])
    : [[], undefined]
  return {
    stored: profile !== undefined,
    confirmedAt: profile?.confirmedAt ?? null,
    openRequest: openRequest ?? null,
    fullName: profile?.fullName ?? (await findName(db, scope.userId)) ?? '',
    joinDate: profile?.joinDate ?? null,
    birthDate: profile?.birthDate ?? null,
    education: entries.map((entry) => ({
      id: entry.id,
      institution: { et: entry.institutionEt, en: entry.institutionEn },
      field: { et: entry.fieldEt, en: entry.fieldEn },
      degree: { et: entry.degreeEt, en: entry.degreeEn },
      startDate: entry.startDate,
      endDate: entry.endDate,
    })),
  }
}

// The session user's profile ID, creating the profile first when there is none.
export async function ownProfileId(db: Executor, scope: Scope) {
  const profile = await repository.findOwnProfile(db, scope)
  if (profile) return profile.id
  const id = uuidv7()
  await repository.insertOwnProfile(db, scope, {
    id,
    fullName: (await findName(db, scope.userId)) ?? '',
    joinDate: null,
    birthDate: null,
  })
  return id
}

export async function savePersonalDetails(db: Database, scope: Scope, input: PersonalDetailsInput) {
  await db.transaction(async (tx) => {
    const profile = await repository.findOwnProfile(tx, scope)
    if (!profile) {
      await repository.insertOwnProfile(tx, scope, { id: uuidv7(), ...input })
      return
    }
    // The database's own rule; a leaver can't sign in, but the check keeps the message.
    if (profile.leftDate && input.joinDate && input.joinDate > profile.leftDate) {
      throw new AppError('INVALID', 'profile_join_after_left')
    }
    await repository.updateProfileDetails(tx, scope, profile.id, input)
  })
}

function educationValues(input: AddEducationInput | UpdateEducationInput) {
  return {
    institutionEt: input.institution.et,
    institutionEn: input.institution.en,
    fieldEt: input.field.et,
    fieldEn: input.field.en,
    degreeEt: input.degree.et,
    degreeEn: input.degree.en,
    startDate: input.period.startDate,
    endDate: input.period.endDate,
  }
}

export async function addEducation(db: Database, scope: Scope, input: AddEducationInput) {
  await db.transaction(async (tx) => {
    const profileId = await ownProfileId(tx, scope)
    await repository.insertEducation(tx, scope, {
      id: input.id,
      profileId,
      ...educationValues(input),
    })
    await repository.touchProfile(tx, scope, profileId)
  })
  return { id: input.id }
}

// The session user's profile, refused unless the entry is on it.
async function profileWithEducation(db: Executor, scope: Scope, educationId: string) {
  const profile = await repository.findOwnProfile(db, scope)
  if (!profile || !(await repository.findEducation(db, scope, profile.id, educationId))) {
    throw new AppError('NOT_FOUND', 'education_not_found')
  }
  return profile.id
}

export async function updateEducation(db: Database, scope: Scope, input: UpdateEducationInput) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithEducation(tx, scope, input.educationId)
    await repository.updateEducation(
      tx,
      scope,
      profileId,
      input.educationId,
      educationValues(input),
    )
    await repository.touchProfile(tx, scope, profileId)
  })
}

export async function deleteEducation(db: Database, scope: Scope, input: DeleteEducationInput) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithEducation(tx, scope, input.educationId)
    await repository.removeEducation(tx, scope, profileId, input.educationId)
    await repository.touchProfile(tx, scope, profileId)
  })
}

// "My profile is current": records the confirmation and closes an open request as
// confirmed. It works without a request too, and creates an empty profile if there's none.
export async function confirmProfile(db: Database, scope: Scope, now = new Date()) {
  await db.transaction(async (tx) => {
    const profileId = await ownProfileId(tx, scope)
    await repository.setConfirmedAt(tx, scope, profileId, now)
    await repository.closeUpdateRequest(tx, scope, profileId, 'confirmed')
  })
  return { confirmedAt: now }
}
