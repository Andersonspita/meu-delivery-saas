import { supabase } from '@/lib/supabase'
import MenuInterface from '@/components/MenuInterface'
import { notFound } from 'next/navigation'

export const revalidate = 0 // Força o Next.js a buscar dados novos sempre

async function getPizzariaData(slug: string) {
  const { data: pizzaria } = await supabase
    .from('pizzarias')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!pizzaria) return null

  // Buscamos tudo. Note que aqui NÃO filtramos por active no banco, 
  // deixamos para o componente decidir, assim evitamos erros de query.
  const [categories, products, deliveryZones, operatingHours] = await Promise.all([
    supabase.from('categories').select('*').eq('pizzaria_id', pizzaria.id).order('name'),
    supabase.from('products').select('*, product_prices(*)').eq('pizzaria_id', pizzaria.id).order('name'),
    supabase.from('delivery_zones').select('*').eq('pizzaria_id', pizzaria.id),
    supabase.from('operating_hours').select('*').eq('pizzaria_id', pizzaria.id)
  ])

  // DEBUG NO TERMINAL: Olhe o terminal do seu VS Code ao carregar a página
  console.log(`--- DEBUG: ${pizzaria.name} ---`)
  console.log(`Bairros no Banco:`, deliveryZones.data?.length)
  console.log(`Dados dos Bairros:`, deliveryZones.data)

  return {
    pizzaria,
    categories: categories.data || [],
    products: products.data || [],
    deliveryZones: deliveryZones.data || [],
    operatingHours: operatingHours.data || []
  }
}

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