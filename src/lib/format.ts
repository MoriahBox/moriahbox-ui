export type Lang = 'en' | 'fr'

export function getLocale(lang: Lang): string {
  return lang === 'fr' ? 'fr-FR' : 'en-US'
}

export function formatCurrency(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(getLocale(lang), {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

export function formatDate(date: string | Date, lang: Lang): string {
  // Date-only strings (YYYY-MM-DD) are UTC midnight; use noon to avoid timezone shifts
  const d = typeof date === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T12:00:00' : date)
    : date
  return d.toLocaleDateString(getLocale(lang), { dateStyle: 'medium' })
}
