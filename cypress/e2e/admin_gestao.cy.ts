describe('Gestão do Admin', () => {
  it('Deve fazer login e visualizar pedidos', () => {
    // 1. Acessa o Admin
    cy.visit('http://localhost:3000/admin')

    // 2. Login (Supabase Auth)
    cy.get('input[type="email"]').type('andersonspita87@gmail.com')
    cy.get('input[type="password"]').type('sua_senha_aqui') // Cuidado com senhas reais em código!
    cy.get('button').contains('Entrar').click()

    // 3. Verifica se entrou no Dashboard
    // Espera a URL mudar ou aparecer um elemento do dashboard
    cy.url().should('include', '/admin/dashboard')
    cy.contains('Fila de Pedidos').should('be.visible')

    // 4. Interagir com um pedido (se houver pedidos na tela)
    // O comando 'exist' faz o teste passar mesmo se não tiver pedido, para não quebrar
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Aceitar e Iniciar")').length > 0) {
        
        // Clica para aceitar o primeiro pedido da lista
        cy.contains('Aceitar e Iniciar').first().click()
        
        // Verifica se o status mudou (o botão deve mudar de texto)
        cy.contains('Saiu para Entrega').should('be.visible')
      }
    })
  })
})