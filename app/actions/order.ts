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

// Função auxiliar para gerar um código curto (Ex: 4X9F2A)
function generateTrackingCode(): string {
  // Gera uma string alfanumérica aleatória de 6 caracteres em maiúsculas
  return Math.random().toString(36).substring(2, 8).toUpperCase()
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

    // 2. Gerar número do pedido e o novo código de rastreio curto
    const orderNumber = Math.floor(1000 + Math.random() * 9000)
    const shortCode = generateTrackingCode()

    // 3. Preparar o objeto para o Supabase
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
        status: 'pending', // Todo o pedido nasce como pendente
        order_items_json: cartItems, // Gravamos o JSON completo do carrinho
        tracking_code: shortCode, // <--- SALVANDO O CÓDIGO CURTO AQUI
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
      error: error.message || 'Erro ao processar o seu pedido.' 
    }
  }
}