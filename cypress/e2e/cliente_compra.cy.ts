describe('Fluxo Completo de Compra do Cliente (End-to-End)', () => {
  const pizzariaSlug = 'pizzaria-sertao' // <-- Use um slug válido!

  beforeEach(() => {
    cy.clearLocalStorage()
    // Aumentamos o timeout de visita para evitar falhas em cold start do Next.js
    cy.visit(`/${pizzariaSlug}`, { timeout: 30000 })
  })

  it('Deve realizar um pedido completo com sucesso e limpar a sacola', () => {
    // ---------------------------------------------------
    // PASSO 1: ESCOLHER O PRODUTO
    // ---------------------------------------------------
    cy.get('.bg-white.p-3.rounded-xl', { timeout: 10000 }).first().click()
    cy.contains('button', 'Adicionar').click()

    // ---------------------------------------------------
    // PASSO 2: REVISAR SACOLA
    // ---------------------------------------------------
    cy.get('.fixed.bottom-0').should('be.visible')
    cy.contains('button', 'Ver Sacola').click()
    cy.contains('button', 'Continuar para Entrega').click()

    // ---------------------------------------------------
    // PASSO 3: PREENCHER DADOS
    // ---------------------------------------------------
    cy.get('input[placeholder="Seu Nome"]').type('João Silva Teste')
    cy.get('input[type="tel"]').type('71999998888') 
    
    // Seleciona zona de entrega e preenche endereço
    cy.get('select').select(1)
    cy.get('textarea').type('Rua das Automações, Lote 42, Apto 101')

    // Ativa campo de troco clicando no span
    cy.contains('span', 'Dinheiro').click({ force: true })
    cy.get('input[placeholder="Ex: 50,00"]').should('be.visible').type('100,00')

    // ---------------------------------------------------
    // PASSO 4: ENVIAR E AGUARDAR RESPOSTA (O segredo da estabilidade)
    // ---------------------------------------------------
    
    // Interceptamos a Server Action do Next.js (POST para a própria página)
    cy.intercept('POST', `/${pizzariaSlug}*`).as('serverAction')

    // Escutamos o alerta de sucesso
    cy.on('window:alert', (texto) => {
      expect(texto).to.include('sucesso')
    })

    // Clica para enviar
    cy.contains('button', 'Enviar Pedido').scrollIntoView().click()

    // 1. Primeiro esperamos a resposta do servidor (Server Action)
    // Isso garante que o banco processou o pedido antes de checarmos a UI
    cy.wait('@serverAction', { timeout: 15000 })

    // 2. Agora sim, o carrinho DEVE ter sumido
    // Usamos uma verificação robusta que aguarda o elemento sair da DOM
    cy.get('.fixed.bottom-0', { timeout: 10000 }).should('not.exist')

    cy.log('✅ Pedido finalizado e carrinho limpo com sucesso!')
  })
})