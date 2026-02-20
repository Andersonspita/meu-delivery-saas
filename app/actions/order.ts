'use server'

import { supabase } from '@/lib/supabase'

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

export async function createValidatedOrder(
  pizzariaId: string,
  checkoutData: CheckoutData,
  cartItems: OrderItem[]
) {
  try {
    // 1. Validação básica de segurança
    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'O carrinho está vazio.' }
    }

    // 2. Gerar número do pedido (Simples: timestamp + rand)
    // Em um sistema real, você poderia usar uma sequence do banco
    const orderNumber = Math.floor(1000 + Math.random() * 9000)

    // 3. Preparar o objeto para o Supabase
    // Note que usamos os nomes de colunas que estão no seu banco
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        pizzaria_id: pizzariaId,
        order_number: orderNumber,
        customer_name: checkoutData.customerName,
        customer_phone: checkoutData.customerPhone,
        delivery_address: checkoutData.deliveryAddress,
        payment_method: checkoutData.paymentMethod,
        total_amount: checkoutData.totalAmount,
        status: 'pending', // Todo pedido nasce como pendente
        order_items_json: cartItems, // Gravamos o JSON completo do carrinho
        cancellation_reason: null
      })
      .select()
      .single()

    if (orderError) {
      console.error('Erro Supabase:', orderError)
      throw new Error(orderError.message)
    }

    return { 
      success: true, 
      order: order 
    }

  } catch (error: any) {
    console.error('Erro na Action:', error.message)
    return { 
      success: false, 
      error: error.message || 'Erro ao processar seu pedido.' 
    }
  }
}