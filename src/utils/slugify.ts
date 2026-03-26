export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[\s-]+/g, '-')
    .replace(/[^0-9a-z-]+/g, '')
    .replace(/^-+|-+$/g, '')
