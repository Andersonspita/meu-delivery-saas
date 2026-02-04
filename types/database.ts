export interface Pizzaria {
  id: string
  created_at: string
  name: string
  slug: string
  whatsapp_number: string
  active: boolean
  logo_url?: string // Novo campo
  address?: string  // Novo campo
}

export interface Category {
  id: string
  pizzaria_id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  pizzaria_id: string
  category_id: string
  name: string
  description: string
  image_url?: string | null // Novo campo (opcional)
  is_available: boolean
  allows_half_half: boolean
  product_prices?: ProductPrice[]
}

export interface ProductPrice {
  id: string
  product_id: string
  size_name: string
  price: number
}

export interface DeliveryZone {
  id: string
  pizzaria_id: string
  neighborhood_name: string
  price: number
  active: boolean
}