'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

interface Item {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  imagem_url?: string;
  ativo: boolean;
}

interface CartItem extends Item {
  quantidade: number;
}

const CART_STORAGE_KEY = 'almoxarifado_cart';
const CART_TIMESTAMP_KEY = 'almoxarifado_cart_timestamp';
const CART_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas

function CatalogoItens() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingStock, setValidatingStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { categoria: selectedCategory }),
        ativo: 'true'
      });

      const response = await fetch(`/api/almoxarifado/itens?${params}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar itens');
      }

      const data = await response.json();
      setFilteredItems(data.data || data);

      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
      }

      // Extrair categorias únicas
      const itemsArray = data.data || data;
      const uniqueCategories = [...new Set(itemsArray.map((item: Item) => item.categoria))] as string[];
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar catálogo de itens');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedCategory]);

  const loadCartFromStorage = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const savedTimestamp = localStorage.getItem(CART_TIMESTAMP_KEY);

      if (savedCart && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const now = Date.now();

        // Verificar se o carrinho não expirou (24 horas)
        if (now - timestamp < CART_EXPIRY_TIME) {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);

          // Validar estoque dos itens do carrinho
          if (parsedCart.length > 0) {
            validateCartStock(parsedCart);
          }
        } else {
          // Carrinho expirado, limpar
          clearCartStorage();
          toast.info('Carrinho expirado. Itens foram removidos.');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      clearCartStorage();
    }
  }, []);

  const saveCartToStorage = useCallback(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      localStorage.setItem(CART_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
    }
  }, [cart]);

  const clearCartStorage = () => {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_TIMESTAMP_KEY);
  };

  useEffect(() => {
    fetchItems();
    loadCartFromStorage();
  }, [fetchItems, loadCartFromStorage]);

  useEffect(() => {
    saveCartToStorage();
  }, [cart, saveCartToStorage]);

  const validateCartStock = async (cartItems: CartItem[]) => {
    setValidatingStock(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const updatedCart: CartItem[] = [];
      let hasChanges = false;

      for (const cartItem of cartItems) {
        const response = await fetch(`/api/almoxarifado/itens/${cartItem.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const currentItem = await response.json();

          if (currentItem.estoque_atual >= cartItem.quantidade) {
            updatedCart.push({
              ...cartItem,
              estoque_atual: currentItem.estoque_atual
            });
          } else if (currentItem.estoque_atual > 0) {
            updatedCart.push({
              ...cartItem,
              quantidade: currentItem.estoque_atual,
              estoque_atual: currentItem.estoque_atual
            });
            hasChanges = true;
            toast.warning(`Quantidade do item "${cartItem.nome}" foi ajustada para o estoque disponível (${currentItem.estoque_atual})`);
          } else {
            hasChanges = true;
            toast.error(`Item "${cartItem.nome}" foi removido do carrinho (sem estoque)`);
          }
        }
      }

      if (hasChanges) {
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Erro ao validar estoque:', error);
    } finally {
      setValidatingStock(false);
    }
  };

  const addToCart = (item: Item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
      if (existingItem.quantidade < item.estoque_atual) {
        setCart(cart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantidade: cartItem.quantidade + 1 }
            : cartItem
        ));
        toast.success(`Quantidade de "${item.nome}" aumentada no carrinho`);
      } else {
        toast.error('Quantidade máxima em estoque atingida');
      }
    } else {
      if (item.estoque_atual > 0) {
        setCart([...cart, { ...item, quantidade: 1 }]);
        toast.success(`"${item.nome}" adicionado ao carrinho`);
      } else {
        toast.error('Item sem estoque disponível');
      }
    }
  };

  const removeFromCart = (itemId: string) => {
    const existingItem = cart.find(cartItem => cartItem.id === itemId);

    if (existingItem && existingItem.quantidade > 1) {
      setCart(cart.map(cartItem =>
        cartItem.id === itemId
          ? { ...cartItem, quantidade: cartItem.quantidade - 1 }
          : cartItem
      ));
    } else {
      setCart(cart.filter(cartItem => cartItem.id !== itemId));
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantidade : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantidade, 0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const goToCart = () => {
    router.push('/almoxarifado/nova-requisicao');
  };

  if (authLoading || loading) {
    return (

      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Carregando catálogo...</span>
        </div>
      </div>

    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/almoxarifado')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Catálogo de Itens</h1>
            <p className="text-muted-foreground">
              Encontre e adicione itens ao seu carrinho
            </p>
          </div>
        </div>

        <Button
          onClick={goToCart}
          className="flex items-center space-x-2"
          disabled={cart.length === 0}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Carrinho ({getTotalCartItems()})</span>
        </Button>
      </div>

      {/* Validação de estoque */}
      {validatingStock && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-800">Validando estoque do carrinho...</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-8 space-y-4">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>

        <div className="flex space-x-4 items-center">
          <Select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {filteredItems.map((item) => {
          const cartQuantity = getCartItemQuantity(item.id);
          const isLowStock = item.estoque_atual <= item.estoque_minimo;
          const isOutOfStock = item.estoque_atual === 0;

          return (
            <Card key={item.id} className={`relative ${isOutOfStock ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                {/* Imagem do item */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  {item.imagem_url ? (
                    <img
                      src={item.imagem_url}
                      alt={item.nome}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* Informações do item */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{item.nome}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.descricao}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{item.categoria}</Badge>
                    <span className="font-bold text-lg">
                      R$ {item.preco_unitario.toFixed(2)}
                    </span>
                  </div>

                  {/* Status do estoque */}
                  <div className="flex items-center space-x-2">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Sem estoque</span>
                      </Badge>
                    ) : isLowStock ? (
                      <Badge variant="outline" className="flex items-center space-x-1 text-orange-600 border-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Estoque baixo</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Em estoque
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {item.estoque_atual} disponível
                    </span>
                  </div>

                  {/* Controles do carrinho */}
                  <div className="flex items-center justify-between pt-2">
                    {cartQuantity > 0 ? (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium px-2">{cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(item)}
                          disabled={cartQuantity >= item.estoque_atual}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        disabled={isOutOfStock}
                        className="flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Adicionar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </Button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Mensagem quando não há itens */}
      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum item encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Tente ajustar os filtros ou termos de busca
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      )}
    </>
  );
}

export default CatalogoItens

