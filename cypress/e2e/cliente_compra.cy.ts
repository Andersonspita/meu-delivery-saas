describe('Fluxo Completo: 2 Pizzas + Bebida', () => {
  beforeEach(() => {
    // Aumente o timeout se seu computador for lento para carregar o site
    cy.visit('http://localhost:3000/pizzaria-love', { timeout: 15000 }) 
  })

  it('Deve adicionar pizzas e bebida ao carrinho e finalizar', () => {
    
    // --- 1. ADICIONAR CALABRESA ---
    // Espera carregar e clica no card da Calabresa
    cy.contains('Calabresa', { timeout: 10000 }).should('be.visible').click()
    cy.contains('Grande').click() // Escolhe tamanho
    cy.get('button').contains('Adicionar à Sacola').click()
    
    // O modal fecha sozinho, seguimos.
    
    // --- 2. ADICIONAR MARGUERITA ---
    // Garante que a Marguerita está visível e clica
    cy.contains('Marguerita').should('be.visible').click()
    cy.contains('Média').click() // Escolhe tamanho diferente
    cy.get('button').contains('Adicionar à Sacola').click()

    // --- 3. ADICIONAR COCA-COLA (CORRIGIDO) ---
    
    // CORREÇÃO: Clica primeiro na aba de categoria "Bebidas Geladas"
    // Usamos .should('be.visible') para garantir que a barra de categorias carregou
    cy.contains('Bebidas Geladas').should('be.visible').click()
    
    // Agora sim, a Coca-Cola deve aparecer na tela. Clicamos nela.
    cy.contains('Coca-Cola', { timeout: 5000 }).should('be.visible').click()
    
    // Clica no botão de adicionar do modal da bebida
    cy.get('button').contains('Adicionar à Sacola').click()

    // --- 4. CONFERIR E FECHAR ---
    // Clica no botão verde da sacola no rodapé
    cy.contains('Ver Sacola').click()

    // --- 5. CHECKOUT ---
    cy.contains('Continuar para Entrega').click()
    
    cy.get('input[placeholder*="Nome"]').type('Cliente Faminto')
    // Usando um número de teste válido para APIs de WhatsApp
    cy.get('input[placeholder*="99"]').type('5511999999999')
    
    // Seleciona o Bairro "Centro" (ou o primeiro da lista)
    cy.get('select').should('be.visible').select(1) 

    // Digita endereço
    cy.get('textarea, input[placeholder*="Rua"], input[placeholder*="Endereço"]')
      .should('be.visible')
      .type('Rua da Festa, 500, Apt 101')

    // Seleciona Pix
    cy.get('input[value="pix"]').check({ force: true })

    // Monitora o window.open (para não abrir aba nova do WhatsApp)
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen')
    })

    cy.contains('Enviar Pedido').click()

    // Verifica se a tentativa de abrir o WhatsApp ocorreu
    cy.get('@windowOpen').should('be.called')
  })
})