'use server'

import { createClient } from '@supabase/supabase-js'
import { CheckoutData } from '@/components/CheckoutModal'

// Interface que corresponde aos itens do carrinho vindos do frontend
export interface CartItemPayload {
  id: string
  productId: string // ID real do produto no Supabase (Necessário para a validação)
  name: string
  size: string
  price: number // Preço enviado pelo front (Vamos IGNORAR por segurança)
  flavors?: string[]
  observation?: string
}

// Inicializa o Supabase Admin (Bypass RLS para inserções seguras feitas pelo servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// A chave SERVICE_ROLE é secreta e nunca vai para o navegador
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAdminKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

export async function createValidatedOrder(
  pizzariaId: string, 
  checkoutData: CheckoutData, 
  cartItems: CartItemPayload[]
) {
  try {
    let calculatedTotal = 0

    // 1. Validar e Recalcular os Preços dos Produtos no Servidor
    for (const item of cartItems) {
      // Vai buscar o preço oficial no banco de dados baseado no Produto e no Tamanho escolhido
      const { data: priceData, error: priceError } = await supabase
        .from('product_prices')
        .select('price')
        .eq('product_id', item.productId) // Usa o ID do produto
        .eq('size_name', item.size)
        .single()

      if (priceError || !priceData) {
        throw new Error(`Inconsistência de preço ou produto não encontrado: ${item.name} (${item.size})`)
      }

      // Soma ao total o preço verdadeiro do Banco de Dados
      calculatedTotal += Number(priceData.price)
    }

    // 2. Validar o Preço da Zona de Entrega
    let deliveryPrice = 0
    let deliveryAddressInfo = 'Retirada no Local'

    if (checkoutData.deliveryZone && checkoutData.deliveryZone.id) {
      const { data: zoneData, error: zoneError } = await supabase
        .from('delivery_zones')
        .select('price, neighborhood_name')
        .eq('id', checkoutData.deliveryZone.id)
        .single()

      if (zoneError || !zoneData) {
        throw new Error('Zona de entrega inválida ou não encontrada no sistema.')
      }

      deliveryPrice = Number(zoneData.price)
      deliveryAddressInfo = `${checkoutData.address} - ${zoneData.neighborhood_name}`
    }

    // 3. O Total Final Real (Protegido contra manipulação do Front-end)
    const finalTotal = calculatedTotal + deliveryPrice

    // 4. Montar o Payload Seguro para o Banco de Dados
    const orderPayload = {
      pizzaria_id: pizzariaId,
      customer_name: checkoutData.customerName,
      customer_phone: checkoutData.customerPhone,
      delivery_address: deliveryAddressInfo,
      delivery_zone_price: deliveryPrice,
      payment_method: checkoutData.paymentMethod,
      total_amount: finalTotal, // INSERÇÃO SEGURA
      status: 'pending',
      order_items_json: cartItems 
    }

    // 5. Inserir na tabela Orders
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (insertError) {
      console.error('Supabase Insert Error:', insertError)
      throw new Error('Falha ao registrar o pedido no banco de dados.')
    }

    // 6. Retorna Sucesso com os dados blindados
    return { 
      success: true, 
      order: newOrder, 
      finalTotal: finalTotal // Enviamos o total validado de volta para o Front montar a mensagem do Whats
    }

  } catch (error: any) {
    console.error('Aviso de Segurança / Erro no Pedido:', error.message)
    return { 
      success: false, 
      error: error.message || 'Erro interno ao processar pedido.' 
    }
  }
}