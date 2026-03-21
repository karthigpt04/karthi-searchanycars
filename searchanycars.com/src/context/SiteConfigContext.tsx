import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { defaultConfig } from '../config/defaults'
import type { SiteConfig } from '../config/defaults'

const SiteConfigContext = createContext<{
  config: SiteConfig
  loading: boolean
  refreshConfig: () => void
}>({
  config: defaultConfig,
  loading: true,
  refreshConfig: () => {},
})

export const useSiteConfig = () => useContext(SiteConfigContext)

export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)

  const refreshConfig = useCallback(() => {
    api.getSiteConfig()
      .then((data) => {
        setConfig((prev) => ({ ...prev, ...data } as SiteConfig))
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refreshConfig()
  }, [refreshConfig])

  return (
    <SiteConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  )
}
