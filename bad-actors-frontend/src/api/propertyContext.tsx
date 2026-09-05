import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { listProperties } from './index'

// 全局物业选择上下文：顶栏切换器与物业情报页共享同一份列表与选中态
interface PropertyContextType {
  properties: any[]
  selectedId: number | null
  setSelectedId: (id: number) => void
  loading: boolean
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listProperties({ page: 1, page_size: 100 })
      .then((res: any) => {
        const list = res.data || []
        setProperties(list)
        if (list.length > 0) setSelectedId(list[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <PropertyContext.Provider value={{ properties, selectedId, setSelectedId, loading }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperties() {
  const context = useContext(PropertyContext)
  if (!context) {
    throw new Error('useProperties must be used within a PropertyProvider')
  }
  return context
}
