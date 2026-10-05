import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime.js'
import '@testing-library/jest-dom/vitest'

// Components render in English, whatever the cookie, jsdom's navigator, or the compiled
// strategy would pick, so tests can assert on the English text.
overwriteGetLocale(() => 'en')

// jsdom has no scrolling; the router scrolls on every navigation.
window.scrollTo = () => {}

// Testing Library unmounts after each test by itself only when Vitest's globals are on.
afterEach(cleanup)
