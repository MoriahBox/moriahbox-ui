export interface MenuImage {
  id: string
  originalFileName: string
  fileExtension: string
  description: string | null
  storagePath: string
  cdnUrl: string
  cdnThumbnailUrl: string
  displayOrder: number
  isPrimary: boolean
}

export interface MenuItem {
  id: string
  type: 'MEAL' | 'RECIPE'
  language: string
  name: string
  description: string | null
  tag: string | null
  prices: Record<string, number>
  steps: string[] | null
  primaryImage: MenuImage | null
  additionalImages: MenuImage[] | null
}
