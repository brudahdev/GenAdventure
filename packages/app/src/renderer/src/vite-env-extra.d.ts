// Explicit ?raw query declarations — vite/client provides '*?raw' but
// TypeScript sometimes fails to match it when the module path has an extension.
declare module '*.svg?raw' {
  const src: string
  export default src
}
