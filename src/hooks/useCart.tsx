import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkProductExist = (productId: number) => {
    const newCart = [...cart]

    const productExist = newCart.find(t => t.id === productId)

    return !!productExist
  }

  const addProduct = async (productId: number) => {
    try {
      // TODO
      // Verificar se existe o produto no carrinho
      const newCart = [...cart]
      const verifyCart = newCart.find(element => element.id === productId);

      // Se existir, adicionar mais uma unidade na quantidade
      // Se não existir, adicionar o item no carrinho

      // Verificar se existe a quantidade desejada no estoque
      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount
      const currentAmount = verifyCart ? verifyCart.amount : 0
      const amount = currentAmount + 1

      // Se não existir estoque, exibir mensagem de erro, encerrar a execucao do método "return"
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      // Se existir, adicionar no carrinho
      if (verifyCart) {
        verifyCart.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`)
        const newProduct = {
          ...product.data, amount: 1
        }
        newCart.push(newProduct)
      }

      // Atualizar o estado "cart"
      setCart(newCart)

      // Atualizar localStorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Atualizar o estado "cart" removendo o produto
      if (!checkProductExist(productId)) throw new Error()

      const newCart = [...cart]
      const cartFiltered = newCart.filter(t => t.id !== productId)

      setCart(cartFiltered)

      // Atualizar localStorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartFiltered))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) throw new Error()

      if (!checkProductExist(productId)) throw new Error()

      const newCart = [...cart]

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = newCart.map(c => {
        if (c.id === productId) {
          return {
            ...c,
            amount: amount
          }
        }

        return c

      });

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
