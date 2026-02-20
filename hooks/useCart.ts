'use client'

import { useState, useEffect } from 'react'

export interface CartItem {
  id: string 
  productId: string
  name: string
  size: string
  price: number
  quantity: number // Campo obrigatório agora
  flavors?: string[]
  observation?: string
}

export function useCart(pizzariaId: string) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${pizzariaId}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error("Erro ao carregar carrinho", e)
      }
    }
    setIsLoaded(true)
  }, [pizzariaId])

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem(`cart_${pizzariaId}`, JSON.stringify(newCart))
  }

  const addToCart = (item: CartItem) => {
    // Verifica se já existe um item IDENTICO (mesmo ID de produto, tamanho e sabores)
    const existingIndex = cart.findIndex(c => 
      c.productId === item.productId && 
      c.size === item.size && 
      JSON.stringify(c.flavors) === JSON.stringify(item.flavors) &&
      c.observation === item.observation
    )

    if (existingIndex > -1) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      saveCart(newCart)
    } else {
      saveCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const updateQuantity = (itemId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    })
    saveCart(newCart)
  }

  const removeFromCart = (itemId: string) => {
    saveCart(cart.filter(i => i.id !== itemId))
  }

  const clearCart = () => saveCart([])

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, isLoaded }
}