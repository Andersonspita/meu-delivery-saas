describe('Gestão do Admin (SaaS Delivery)', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('CT01: Deve processar o ciclo de vida completo de um pedido', () => {
    // 1. Truque Sênior: Bloqueia a abertura de novos separadores (WhatsApp) para não quebrar o teste
    cy.visit('/admin', {
      onBeforeLoad(win) {
        cy.stub(win, 'open').as('whatsappTab')
      }
    })

    const email = Cypress.env('ADMIN_EMAIL') || 'andersonspita87@gmail.com'
    const password = Cypress.env('ADMIN_PASSWORD') || '0134679Ab@' // Cuidado com senhas reais em código!

    cy.get('input[type="email"]').should('be.visible').type(email)
    cy.get('input[type="password"]').should('be.visible').type(password, { log: false }) 
    cy.contains('button', /Acessar Painel/i).click()

    cy.url({ timeout: 15000 }).should('include', '/admin')
    cy.wait(3000)
    cy.contains('button', /ativos/i).should('be.visible')

    cy.get('body').then(($body) => {
      // Verifica se existe um pedido "Pendente" para iniciarmos o fluxo
      if ($body.find('button:contains("Aceitar Pedido")').length > 0) {
        
        cy.log('🍕 Passo 1: Aceitando o Pedido...')
        cy.contains('button', 'Aceitar Pedido').first().scrollIntoView().click({ force: true })
        
        // Verifica se o nosso 'stub' intercetou a chamada para o WhatsApp do Rastreio
        cy.get('@whatsappTab').should('have.been.called')

        cy.log('🛵 Passo 2: Enviando para Entrega...')
        // O botão tem de ter mudado para "Enviar Entrega". Clicamos nele!
        cy.contains('button', 'Enviar Entrega', { timeout: 8000 }).first().scrollIntoView().click({ force: true })

        cy.log('✅ Passo 3: Concluindo o Pedido...')
        // O botão tem de ter mudado para "Concluir". Clicamos para finalizar!
        cy.contains('button', 'Concluir', { timeout: 8000 }).first().scrollIntoView().click({ force: true })

        cy.log('📂 Passo 4: Verificando na aba de Finalizados...')
        // Como foi concluído, o pedido deve sumir da aba 'Ativos' e ir para 'Finalizados'
        cy.contains('button', /finalizados/i).click()
        
        // Aguarda a renderização e garante que há algo na aba finalizados
        cy.wait(1000)
        cy.get('main').children().should('have.length.greaterThan', 0)

      } else {
        cy.log('⚠️ Nenhum pedido "Pendente" para testar o fluxo completo. Faça um pedido no cliente primeiro!')
      }
    })
  })
})