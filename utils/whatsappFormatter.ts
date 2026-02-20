// utils/whatsappFormatter.ts

/**
 * Mensagem enviada quando o admin ACEITA o pedido e gera o link de rastreio
 */
export function formatAdminConfirmationMessage(
  orderNumber: string | number,
  pizzariaName: string,
  customerName: string,
  trackingUrl: string
): string {
  let message = `✅ *PEDIDO #${orderNumber} ACEITO!*\n\n`
  message += `Olá, ${customerName}! Já estamos preparando seu pedido com muito carinho aqui na *${pizzariaName}*.\n\n`
  message += `📍 *ACOMPANHE O STATUS EM TEMPO REAL:*\n`
  message += `${trackingUrl}\n\n`
  message += `Você poderá ver cada etapa, desde a cozinha até a chegada do entregador! 🛵🔥`
  
  return message
}

/**
 * Mensagem enviada quando o admin CANCELA o pedido
 */
export function formatCancellationMessage(
  orderNumber: string | number,
  customerName: string,
  reason: string
): string {
  let message = `❌ *PEDIDO #${orderNumber} CANCELADO*\n\n`
  message += `Olá ${customerName}.\n\nInfelizmente seu pedido precisou ser cancelado pelo restaurante.\n\n`
  message += `*Motivo:* ${reason}\n\n`
  message += `Pedimos desculpas pelo inconveniente. Se tiver dúvidas, pode nos chamar por aqui.`
  
  return message
}