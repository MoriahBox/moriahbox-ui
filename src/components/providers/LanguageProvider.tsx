'use client'

import { createContext, useContext, useState } from 'react'
import { translations, type Lang } from '@/lib/translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: typeof translations.en
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: translations.fr,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
