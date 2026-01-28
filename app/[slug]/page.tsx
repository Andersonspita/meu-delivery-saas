import { supabase } from '../../lib/supabase'
import { notFound } from 'next/navigation'
import { Pizzaria, Category, Product } from '../../types/database'
import MenuInterface from '../../components/MenuInterface' 


async function getData(slug: string) {
  
  const { data: pizzaria } = await supabase
    .from('pizzarias')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!pizzaria) return null

  
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('pizzaria_id', pizzaria.id)
    .order('sort_order', { ascending: true })

  
  const { data: products } = await supabase
    .from('products')
    .select('*, product_prices(price, size_name)') 
    .eq('pizzaria_id', pizzaria.id)
    .eq('is_available', true)

  
  const { data: deliveryZones } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('pizzaria_id', pizzaria.id)
    .order('price', { ascending: true })

  return { 
    pizzaria, 
    categories: categories || [], 
    products: products || [],
    deliveryZones: deliveryZones || [] 
  }
}

export default async function CardapioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)

  if (!data) return notFound()

  
  return (
    <MenuInterface 
      pizzaria={data.pizzaria} 
      categories={data.categories} 
      products={data.products}
      deliveryZones={data.deliveryZones} 
    />
  )
}