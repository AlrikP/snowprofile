// The seeded accounts and fixed ids, apart from the demo data generator, so the sign-in
// page's server code can name them without bundling the generator.

// Every seeded user signs in with this password, in demo mode only (docs/architecture.md,
// "Sign-in modes").
export const SEED_PASSWORD = 'snowprofile-demo'

// Fixed UUIDv7-shaped ids, so tests can name seeded rows.
function id(n: number) {
  return `01900000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`
}

export const seedIds = {
  users: { admin: id(0x101), employee: id(0x102) },
  orgs: { demo: id(0x201), rabasaare: id(0x202), tormilind: id(0x203) },
} as const

// The sign-in page lists these in demo mode.
export const seedUsers = [
  { id: seedIds.users.admin, name: 'Anna Admin', email: 'admin@demo.example.com', role: 'admin' },
  {
    id: seedIds.users.employee,
    name: 'Erik Employee',
    email: 'employee@demo.example.com',
    role: 'employee',
  },
] as const
