/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { flagged } from './plans'

test('counts scans of watched tables under their names or aliases, and temp sorts', () => {
  const sql =
    'select "d0"."id" from "participation" as "d0" join "project" "p" on "p"."id" = "d0"."project_id"'
  expect(
    flagged(sql, [
      'SCAN d0',
      'SCAN p USING COVERING INDEX project_organization_idx',
      'SEARCH participation USING INDEX participation_profile_idx (profile_id=?)',
      'SCAN member',
      'USE TEMP B-TREE FOR ORDER BY',
    ]),
  ).toEqual({ scans: 2, sorts: 1 })
})
