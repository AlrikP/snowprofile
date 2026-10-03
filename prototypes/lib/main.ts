// Entry for prototypes/build/prototype.js, which every page loads after build/icons.js.
import { startPrototype } from './frame'
import { startUi } from './ui'

document.addEventListener('DOMContentLoaded', () => {
  startPrototype()
  startUi()
})
