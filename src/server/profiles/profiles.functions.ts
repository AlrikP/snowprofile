// Profile server functions. Thin wrappers: the rules live in profiles.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import * as ownProjects from './own-projects.server'
import * as participations from './participations.server'
import * as peopleRules from './people.server'
import {
  AddEducationInput,
  AddOwnProjectInput,
  DeleteOwnProjectInput,
  UpdateOwnProjectInput,
  AddParticipationInput,
  DeleteParticipationInput,
  MarkLeftInput,
  ProfileInput,
  RequestUpdateFromAllInput,
  UpdateParticipationInput,
  DeleteEducationInput,
  PersonalDetailsInput,
  RequestProfileUpdateInput,
  UpdateEducationInput,
} from './profiles.schemas'
import * as profiles from './profiles.server'

export const requestProfileUpdate = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(RequestProfileUpdateInput)
  .handler(({ data, context }) => profiles.requestProfileUpdate(context.db, context.scope, data))

export const getMyProfile = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => profiles.myProfile(context.db, context.scope))

export const savePersonalDetails = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(PersonalDetailsInput)
  .handler(({ data, context }) => profiles.savePersonalDetails(context.db, context.scope, data))

export const addEducation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddEducationInput)
  .handler(({ data, context }) => profiles.addEducation(context.db, context.scope, data))

export const updateEducation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateEducationInput)
  .handler(({ data, context }) => profiles.updateEducation(context.db, context.scope, data))

export const deleteEducation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(DeleteEducationInput)
  .handler(({ data, context }) => profiles.deleteEducation(context.db, context.scope, data))

export const getMyParticipations = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => participations.myParticipations(context.db, context.scope))

export const addParticipation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddParticipationInput)
  .handler(({ data, context }) => participations.addParticipation(context.db, context.scope, data))

export const updateParticipation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateParticipationInput)
  .handler(({ data, context }) =>
    participations.updateParticipation(context.db, context.scope, data),
  )

export const deleteParticipation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(DeleteParticipationInput)
  .handler(({ data, context }) =>
    participations.deleteParticipation(context.db, context.scope, data),
  )

export const getMyOwnProjects = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => ownProjects.myOwnProjects(context.db, context.scope))

export const addOwnProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddOwnProjectInput)
  .handler(({ data, context }) => ownProjects.addOwnProject(context.db, context.scope, data))

export const updateOwnProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateOwnProjectInput)
  .handler(({ data, context }) => ownProjects.updateOwnProject(context.db, context.scope, data))

export const deleteOwnProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(DeleteOwnProjectInput)
  .handler(({ data, context }) => ownProjects.deleteOwnProject(context.db, context.scope, data))

export type OwnProject = Awaited<ReturnType<typeof getMyOwnProjects>>[number]
export type Participation = Awaited<ReturnType<typeof getMyParticipations>>[number]
export type MyProfile = Awaited<ReturnType<typeof getMyProfile>>
export type Education = MyProfile['education'][number]

export const getPeople = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => peopleRules.people(context.db, context.scope))

export const requestUpdateFromAll = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(RequestUpdateFromAllInput)
  .handler(({ data, context }) => peopleRules.requestUpdateFromAll(context.db, context.scope, data))

export const cancelUpdateRequest = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(ProfileInput)
  .handler(({ data, context }) => peopleRules.cancelUpdateRequest(context.db, context.scope, data))

export const markLeft = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(MarkLeftInput)
  .handler(({ data, context }) => peopleRules.markLeft(context.db, context.scope, data))

export type Person = Awaited<ReturnType<typeof getPeople>>[number]
