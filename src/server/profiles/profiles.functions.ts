// Profile server functions. Thin wrappers: the rules live in profiles.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import {
  AddEducationInput,
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

export type MyProfile = Awaited<ReturnType<typeof getMyProfile>>
export type Education = MyProfile['education'][number]
