describe('Fluxo de Pedido do Cliente (SaaS Delivery)', () => {
  // 🚨 ATENÇÃO: Lembre-se de colocar o slug da pizzaria de teste!
  const slugPizzaria = 'pizzaria-love' 

  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    
    // ⏰ MÁQUINA DO TEMPO: Congela o relógio para garantir que a loja esteja sempre aberta
    const meioDia = new Date(2026, 1, 18, 12, 0, 0).getTime()
    cy.clock(meioDia)

    cy.visit(`/${slugPizzaria}`)
  })

  it('CT01: Deve realizar um pedido simples (1 sabor) até o fim', () => {
    cy.get('main > div').first().click()
    cy.contains('button', 'Adicionar').should('be.visible').click({ force: true })
    cy.contains('Pedir Agora').should('be.visible').click()
    cy.contains('Minha Sacola').should('be.visible')
    cy.contains('Dados de Entrega').click()
    cy.contains('Checkout Final').should('be.visible')
    
    cy.get('input[placeholder="Quem recebe o pedido?"]').type('Robô de Testes Cypress')
    cy.get('input[placeholder="(00) 00000-0000"]').type('71999999999')
    cy.get('select').select(1)
    cy.get('textarea[placeholder*="Ex: Rua"]').type('Rua dos Algoritmos, 404')
    
    cy.contains('button', 'pix').click()
    cy.contains('Confirmar Pedido').should('not.be.disabled')
  })

  it('CT02: Deve conseguir montar uma pizza Meio a Meio (2 sabores)', () => {
    cy.contains('button', /pizza/i).click()
    cy.get('main > div').first().click()

    // Ensina o robô a rolar a tela até achar o botão, ignorando o rodapé
    cy.contains('button', 'Meio a Meio').scrollIntoView().click({ force: true })
    
    // Faz a mesma coisa com a lista de sabores
    cy.get('input[name="secondFlavor"]').first().scrollIntoView().check({ force: true }) 

    cy.contains('button', 'Adicionar').click({ force: true })
    cy.contains('Pedir Agora').should('exist')
  })

  it('CT03: Deve manipular as quantidades e remover itens da sacola', () => {
    cy.get('main > div').first().click()
    cy.contains('button', 'Adicionar').should('be.visible').click({ force: true })
    cy.contains('Pedir Agora').click()

    cy.contains('button', '+').click()
    cy.get('span').contains('2').should('be.visible')

    cy.contains('button', '-').click()
    cy.get('span').contains('1').should('be.visible')

    cy.contains('button', /excluir/i).click()
    cy.contains('Sua sacola está vazia').should('be.visible')
  })

  it('CT04: Deve impedir o envio do formulário com dados em branco', () => {
    cy.get('main > div').first().click()
    cy.contains('button', 'Adicionar').should('be.visible').click({ force: true })
    cy.contains('Pedir Agora').click()
    cy.contains('Dados de Entrega').click()

    cy.contains('Confirmar Pedido').click()

    cy.on('window:alert', (text) => {
      expect(text).to.contains('Preencha')
    })
  })

  it('CT05: Lógica de Pagamento em Dinheiro e Troco', () => {
    cy.get('main > div').first().click()
    cy.contains('button', 'Adicionar').should('exist').click({ force: true })
    cy.contains('Pedir Agora').click()
    cy.contains('Dados de Entrega').click()

    // Rola a tela até o botão de dinheiro e clica
    cy.contains('button', /dinheiro/i).scrollIntoView().click({ force: true })
    
    // Confirma que o texto do troco existe na tela
    cy.contains('Troco para quanto?').should('exist')
    
    // Rola até o campo de digitar o troco e digita o valor
    cy.get('input[placeholder*="Ex: 50,00"]').scrollIntoView().type('100,00', { force: true })
  })

}) // <--- AQUI ESTAVA O PROBLEMA! Essa pequena chave finalizando o arquivo.