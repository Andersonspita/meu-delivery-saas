// types/database.ts

export interface Pizzaria {
  id: string
  name: string
  slug: string
  whatsapp_number: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface ProductPrice {
  price: number
  size_name?: string
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  image_url: string | null
  is_available: boolean
  allows_half_half: boolean
  product_prices?: ProductPrice[] 
}

export interface DeliveryZone {
  id: string
  neighborhood_name: string
  price: number
}

export interface Order {
  order_number?: number 
}