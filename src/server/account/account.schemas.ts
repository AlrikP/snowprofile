import * as v from 'valibot'
import { locales } from '#/paraglide/runtime.js'

export const SaveLocaleInput = v.object({ locale: v.picklist(locales) })
export type SaveLocaleInput = v.InferOutput<typeof SaveLocaleInput>
