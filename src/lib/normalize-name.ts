// The normalized_name of catalogue entries and projects: lowercase, without accents, spaces,
// or punctuation other than # and +, so "Vue.js" and "VueJS" meet, and C# stays apart from
// C. The database's unique indexes compare it, so the app, the seed, and the sheet migration
// all normalize through this one function.
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}#+]/gu, '')
}
