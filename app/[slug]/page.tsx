import { supabase } from '@/lib/supabase'
import MenuInterface from '@/components/MenuInterface'
import { notFound } from 'next/navigation'

export const revalidate = 0 // Garante que o cardápio esteja sempre atualizado

// 1. A função que busca e organiza os dados (com a Lógica Ninja)
async function getPizzariaData(slug: string) {
  const { data: pizzaria } = await supabase
    .from('pizzarias')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!pizzaria) return null

  const [categories, products, deliveryZones, operatingHours] = await Promise.all([
    supabase.from('categories').select('*').eq('pizzaria_id', pizzaria.id).order('name'),
    supabase.from('products').select('*, product_prices(*)').eq('pizzaria_id', pizzaria.id).order('name'),
    supabase.from('delivery_zones').select('*').eq('pizzaria_id', pizzaria.id),
    supabase.from('operating_hours').select('*').eq('pizzaria_id', pizzaria.id)
  ])

  // Lógica Ninja: Pizza sempre no topo
  const sortedCategories = (categories.data || []).sort((a, b) => {
    const isAPizza = a.name.toLowerCase().includes('pizza')
    const isBPizza = b.name.toLowerCase().includes('pizza')
    
    if (isAPizza && !isBPizza) return -1 
    if (!isAPizza && isBPizza) return 1  
    return 0 
  })

  return {
    pizzaria,
    categories: sortedCategories,
    products: products.data || [],
    deliveryZones: deliveryZones.data || [],
    operatingHours: operatingHours.data || []
  }
}

// 2. O COMPONENTE REACT (Que estava faltando e causou o erro)
export default async function CardapioPage({ params }: { params: { slug: string } }) {
  const { slug } = await params
  const data = await getPizzariaData(slug)

  if (!data) return notFound()

  return (
    <MenuInterface 
      pizzaria={data.pizzaria} 
      categories={data.categories} 
      products={data.products}
      deliveryZones={data.deliveryZones}
      operatingHours={data.operatingHours} 
    />
  )
}