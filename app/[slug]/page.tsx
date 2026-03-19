import { notFound } from 'next/navigation'
import { prisma } from '../../lib/prisma'
import MenuInterface from '../../components/MenuInterface'

async function getData(slug: string) {
  // 1. Busca a pizzaria pelo slug
  const pizzaria = await prisma.pizzaria.findUnique({
    where: { slug }
  })

  if (!pizzaria) return null

  // 2. Busca categorias, produtos e zonas de entrega EM PARALELO (Alta performance)
  const [categories, products, deliveryZones] = await Promise.all([
    prisma.category.findMany({
      where: { pizzaria_id: pizzaria.id },
      orderBy: { sort_order: 'asc' }
    }),
    prisma.product.findMany({
      where: { 
        pizzaria_id: pizzaria.id,
        is_available: true
      },
      include: { 
        product_prices: {
          select: { price: true, size_name: true }
        } 
      }
    }),
    prisma.deliveryZone.findMany({
      where: { pizzaria_id: pizzaria.id },
      orderBy: { price: 'asc' }
    })
  ])

  return { 
    pizzaria, 
    categories, 
    products,
    deliveryZones 
  }
}

export default async function CardapioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)

  if (!data) return notFound()

  return (
    <MenuInterface 
      pizzaria={data.pizzaria as any} 
      categories={data.categories} 
      products={data.products}
      deliveryZones={data.deliveryZones} 
    />
  )
}