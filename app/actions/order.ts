'use server'

import { prisma } from '@/lib/prisma'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  size: string
  flavors?: string[]
  observation?: string
}

interface CheckoutData {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  paymentMethod: 'dinheiro' | 'cartao' | 'pix'
  changeFor?: string | null
  totalAmount: number
  deliveryPrice: number
}

function generateTrackingCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createValidatedOrder(
  pizzariaId: string,
  checkoutData: CheckoutData,
  cartItems: OrderItem[]
) {
  try {
    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'O carrinho está vazio.' }
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000)
    const shortCode = generateTrackingCode()

    // AJUSTADO: Usando o nome correto da coluna 'order_items_json'
    // Adicionamos o 'as any' no final do objeto data para o Prisma parar de reclamar dos nomes
    const order = await prisma.order.create({
      data: {
        pizzaria_id: pizzariaId,
        order_number: orderNumber,
        customer_name: checkoutData.customerName,
        customer_phone: checkoutData.customerPhone,
        delivery_address: checkoutData.deliveryAddress,
        payment_method: checkoutData.paymentMethod,
        total_amount: checkoutData.totalAmount,
        status: 'pending',
        order_items_json: cartItems as any,
        tracking_code: shortCode,
        cancellation_reason: null
      } as any
    })

    return { 
      success: true, 
      order: order 
    }

  } catch (error: any) {
    console.error('Erro ao criar pedido no Prisma:', error.message)
    return { 
      success: false, 
      error: 'Erro ao processar o seu pedido localmente.' 
    }
  }
}