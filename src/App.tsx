
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBasket, 
  ShoppingCart, 
  User as UserIcon, 
  LayoutDashboard, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  Star,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Package,
  Clock,
  ArrowLeft,
  Settings,
  BarChart3,
  TrendingUp,
  Tags,
  LogOut,
  Sparkles,
  MapPin,
  QrCode,
  Copy,
  MessageCircle,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';

import { Product, CartItem, User, Order, UnitType, Address, StoreSettings } from './types';
import { INITIAL_PRODUCTS, SHIPPING_RATE, FREE_SHIPPING_THRESHOLD, MOCK_COUPONS } from './constants';
import { getSmartRecipeSuggestions, generateProductDescription } from './services/geminiService';
import { api } from './services/api';

// --- Sub-components (Scoped Helpers) ---

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
  </div>
);

// --- Main App Component ---

export default function App() {
  // State
  const [view, setView] = useState<'home' | 'cart' | 'checkout' | 'admin' | 'orders' | 'profile' | 'login' | 'payment-qr' | 'product-detail'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    unit: 'kg' as UnitType,
    category: 'fruits',
    imageUrl: 'https://images.unsplash.com/photo-1610832958506-ee5633842b91?w=800&q=80',
    stock: 0,
    rating: 4.5,
    reviewsCount: 0
  });

  // Auth form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCpf, setAuthCpf] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationUserId, setVerificationUserId] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Sync data
  useEffect(() => {
    fetchProducts();
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const settings = await api.getStoreSettings();
      setStoreSettings(settings);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin' && view === 'admin') {
      fetchAdminStats();
      fetchOrders();
    }
    if (view === 'orders' && currentUser) {
      fetchOrders();
    }
  }, [view, currentUser]);

  const fetchProducts = async () => {
    try {
      const p = await api.getProducts();
      setProducts(p);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      if (currentUser?.role === 'admin' && view === 'admin') {
        const o = await api.getOrders();
        setOrders(o);
      } else if (currentUser && view === 'orders') {
        const o = await api.getUserOrders(currentUser.id);
        setOrders(o);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente excluir este pedido do seu histórico?')) return;
    setIsLoading(true);
    try {
      await api.deleteOrder(orderId);
      fetchOrders();
    } catch (e) {
      alert('Erro ao excluir pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!currentUser) return;
    if (!confirm('Deseja realmente limpar todo o seu histórico de compras dos últimos 6 meses?')) return;
    setIsLoading(true);
    try {
      await api.clearUserHistory(currentUser.id);
      fetchOrders();
    } catch (e) {
      alert('Erro ao limpar histórico');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchAdminStats = async () => {
    try {
      const stats = await api.getAdminStats();
      setAdminStats(stats);
    } catch (e) {
      console.error(e);
    }
  };
  
  // Checkout State
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState<Address>({
    fullName: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discount = appliedCoupon ? (cartTotal * 0.1) : 0; 
  const shipping = (deliveryType === 'pickup' || cartTotal >= FREE_SHIPPING_THRESHOLD) ? 0 : SHIPPING_RATE;
  const finalTotal = cartTotal - discount + shipping;

  // Handlers
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const validateAddress = () => {
    const digitsOnly = address.phone.replace(/\D/g, '');
    const isPhoneValid = digitsOnly.length >= 10 && digitsOnly.length <= 11;
    
    if (!isPhoneValid) {
      alert('Por favor, insira um número de WhatsApp válido com DDD (10 ou 11 dígitos).');
      return false;
    }

    if (deliveryType === 'pickup') return !!(address.fullName && address.phone);
    return !!(address.fullName && address.street && address.number && address.neighborhood && address.city && address.state && address.phone);
  };

  const sendWhatsAppMessage = (order: Order) => {
    const itemsList = order.items.map(item => `${item.quantity}x ${item.name} (R$ ${item.price.toFixed(2)})`).join('\n');
    const deliveryInfo = order.deliveryType === 'delivery' 
      ? `Endereço: ${order.address?.street}, ${order.address?.number} - ${order.address?.neighborhood}, ${order.address?.city}`
      : 'Retirada na Loja';
    
    const storeName = storeSettings?.storeName || 'HORTIFRESH';
    const message = `*PEDIDO ${storeName.toUpperCase()} - #${order.id}*\n\n` +
      `*Cliente:* ${order.address?.fullName}\n` +
      `*Celular:* ${order.address?.phone}\n\n` +
      `*Itens:*\n${itemsList}\n\n` +
      `*Total:* R$ ${order.total.toFixed(2)}\n` +
      `*Pagamento:* ${order.paymentMethod.toUpperCase()}\n` +
      `*Tipo:* ${order.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}\n` +
      `${deliveryInfo}\n\n` +
      `*Status:* ${order.status.toUpperCase()}\n\n` +
      `_Obrigado por comprar na ${storeName}!_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${order.address?.phone?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      setView('login');
      return;
    }
    
    if (!validateAddress()) {
      alert('Por favor, preencha todos os campos do endereço de entrega.');
      return;
    }

    setIsLoading(true);
    try {
      const newOrder: Order = {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userId: currentUser.id,
        items: [...cart],
        total: finalTotal,
        status: 'pending',
        date: new Date().toISOString(),
        paymentMethod,
        deliveryType,
        address: deliveryType === 'delivery' ? address : undefined,
      };
      
      await api.placeOrder(newOrder);
      setLastOrder(newOrder);
      setCart([]);
      setAppliedCoupon(null);
      setIsLoading(false);
      
      if (paymentMethod === 'pix') {
        setView('payment-qr');
      } else {
        setView('orders');
      }
    } catch (e) {
      alert('Erro ao realizar pedido');
      setIsLoading(false);
    }
  };

  const copyPixCode = () => {
    const code = `00020126360014BR.GOV.BCB.PIX011400000000000000${lastOrder?.id}`;
    navigator.clipboard.writeText(code);
    alert('Código Pix copiado!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setIsLoading(true);
    try {
      const user = await api.login(authEmail, authPassword);
      setCurrentUser(user);
      setAddress(prev => ({ ...prev, fullName: user.name }));
      setIsLoading(false);
      
      // Clear form
      setAuthEmail('');
      setAuthPassword('');
      setAuthCpf('');
      
      if (user.role === 'admin') {
        setView('admin');
      } else {
        setView('home');
      }
    } catch (e: any) {
      if (e.needsVerification) {
        setVerificationUserId(e.userId);
        setIsLoading(false);
        return;
      }
      alert(e.message || 'Erro ao fazer login');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authName || !authCpf) return;

    setIsLoading(true);
    try {
      const response: any = await api.register({
        name: authName,
        email: authEmail,
        password: authPassword as any,
        cpf: authCpf
      });
      
      if (response.needsVerification) {
        setVerificationUserId(response.userId);
        setIsLoading(false);
        return;
      }

      const user = response;
      setCurrentUser(user);
      setAddress(prev => ({ ...prev, fullName: user.name }));
      setIsLoading(false);
      
      // Clear form
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthCpf('');
      setIsRegisterMode(false);
      
      setView('home');
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar');
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationUserId || !verificationCode) return;

    setIsLoading(true);
    try {
      const user = await api.verifyCode(verificationUserId, verificationCode);
      setCurrentUser(user);
      setAddress(prev => ({ ...prev, fullName: user.name }));
      
      // Reset verification state
      setVerificationUserId(null);
      setVerificationCode('');
      setAuthEmail('');
      setAuthPassword('');
      setAuthCpf('');
      setAuthName('');
      setIsRegisterMode(false);
      
      setIsLoading(false);
      setView('home');
      alert('Conta verificada com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao verificar código');
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const updatedUser = await api.updateProfile(currentUser.id, data);
      setCurrentUser(updatedUser);
      setIsLoading(false);
      alert('Perfil atualizado com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar perfil');
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return;

    setIsLoading(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productForm as Product);
      } else {
        const newProduct = {
          ...productForm,
          id: `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        } as Product;
        await api.createProduct(newProduct);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (e) {
      alert('Erro ao salvar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAiDescription = async () => {
    if (!productForm.name) {
      alert('Digite o nome do produto primeiro');
      return;
    }
    setIsLoading(true);
    try {
      const desc = await generateProductDescription(productForm.name);
      setProductForm(prev => ({ ...prev, description: desc }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      unit: 'kg' as UnitType,
      category: 'fruits',
      imageUrl: 'https://images.unsplash.com/photo-1610832958506-ee5633842b91?w=800&q=80',
      stock: 50,
      rating: 5.0,
      reviewsCount: 0
    });
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setShowProductModal(true);
  };

  const confirmDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsLoading(true);
    try {
      await api.deleteProduct(productToDelete.id);
      fetchProducts();
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (e) {
      alert('Erro ao excluir produto');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiRecipe = async () => {
    setIsLoading(true);
    const suggestion = await getSmartRecipeSuggestions(cart);
    setAiSuggestion(suggestion);
    setIsLoading(false);
  };

  // --- Views ---

  const contactStoreWhatsApp = () => {
    if (!storeSettings) return;
    const message = `Olá! Gostaria de mais informações sobre os produtos da *${storeSettings.storeName}*.\n\n` +
      `*Dados da Empresa*:\n` +
      `CNPJ: ${storeSettings.cnpj || 'N/A'}\n` +
      `Endereço: ${storeSettings.address || 'N/A'}, ${storeSettings.city}/${storeSettings.state}\n` +
      `CEP: ${storeSettings.cep || 'N/A'}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${storeSettings.whatsappNumber?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderHeader = () => (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      {storeSettings && (
        <div className="bg-emerald-900 text-[10px] text-white py-1.5 px-4 hidden sm:block">
          <div className="max-w-7xl mx-auto flex justify-between items-center font-bold tracking-wider uppercase">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-emerald-300"><MapPin size={10} /> {storeSettings.city}/{storeSettings.state}</span>
              <span className="flex items-center gap-1.5 text-emerald-300"><Clock size={10} /> Aberto agora</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{storeSettings.cnpj}</span>
              <button 
                onClick={contactStoreWhatsApp}
                className="flex items-center gap-1 text-lime-400 hover:text-white transition-colors"
                title="Falar com a gente"
              >
                <div className="bg-lime-400 text-emerald-900 rounded-sm p-0.5"><MessageCircle size={8} /></div>
                Suporte WhatsApp: {storeSettings.whatsappNumber}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <ShoppingBasket size={24} />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent hidden sm:block">
            {storeSettings?.storeName || 'HortiFresh'}
          </span>
        </div>

        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="O que você está procurando?"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('cart')}
            className="relative p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cart.length}
              </span>
            )}
          </button>
          
          {currentUser ? (
            <div className="relative flex items-center gap-2">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-1 pl-3 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{currentUser.name.split(' ')[0]}</span>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                  <UserIcon size={18} />
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute top-12 right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 hidden md:block animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-slate-50 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Olá, {currentUser.name}</p>
                  </div>
                  {currentUser.role === 'admin' && (
                    <button onClick={() => {setView('admin'); setIsMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2">
                      <LayoutDashboard size={16} /> Painel Admin
                    </button>
                  )}
                   <button onClick={() => {setView('profile'); setIsMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2">
                    <UserIcon size={16} /> Minha Conta
                  </button>
                  <button onClick={() => {setView('orders'); setIsMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2">
                    <Package size={16} /> Meus Pedidos
                  </button>
                  <div className="my-2 border-t border-slate-50"></div>
                  <button onClick={() => {setCurrentUser(null); setView('home'); setIsMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setView('login')}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-full hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
            >
              Entrar
            </button>
          )}

          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-xl p-4 md:hidden z-50">
          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Buscar produtos..."
              className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {currentUser?.role === 'admin' && (
              <button onClick={() => {setView('admin'); setIsMenuOpen(false)}} className="flex items-center gap-2 text-slate-700 font-medium py-2">
                <LayoutDashboard size={20} /> Painel Admin
              </button>
            )}
            <button onClick={() => {setView('orders'); setIsMenuOpen(false)}} className="flex items-center gap-2 text-slate-700 font-medium py-2">
              <Package size={20} /> Meus Pedidos
            </button>
            <button onClick={() => {contactStoreWhatsApp(); setIsMenuOpen(false)}} className="flex items-center gap-2 text-emerald-600 font-bold py-2 border-t border-emerald-50">
              <MessageCircle size={20} /> Suporte WhatsApp
            </button>
            {currentUser && (
              <button onClick={() => {setCurrentUser(null); setView('home'); setIsMenuOpen(false)}} className="flex items-center gap-2 text-red-600 font-medium py-2">
                <LogOut size={20} /> Sair
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );

  const renderHome = () => (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <section className="mb-12 relative overflow-hidden rounded-3xl bg-emerald-900 text-white p-8 md:p-16">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Saúde e frescor <br /> 
            <span className="text-lime-400">direto da horta</span> <br /> 
            para sua casa.
          </h1>
          <p className="text-emerald-100 text-lg mb-8">
            Produtos selecionados manualmente para garantir a melhor qualidade em sua mesa diariamente.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-lime-400 text-emerald-900 px-8 py-3 rounded-full font-bold hover:bg-white transition-colors shadow-lg shadow-lime-900/20">
              Ver Ofertas
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/2 opacity-30 md:opacity-100 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=800" 
            alt="Hortifruti" 
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mb-12 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-4 min-w-max">
          {['all', 'fruits', 'vegetables', 'legumes', 'natural'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all border ${
                selectedCategory === cat 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat === 'fruits' ? 'Frutas' : cat === 'vegetables' ? 'Verduras' : cat === 'legumes' ? 'Legumes' : 'Naturais'}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Produtos em Destaque</h2>
          <span className="text-sm text-slate-500">{filteredProducts.length} itens encontrados</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => {
                setSelectedProduct(product);
                setView('product-detail');
              }}
              className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-amber-400 mb-1">
                  <Star size={12} fill="currentColor" />
                  <span className="text-[10px] font-bold text-slate-600">{product.rating}</span>
                </div>
                <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-50">
                  <div>
                    <span className="text-lg font-bold text-emerald-700">R$ {product.price.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 ml-1">/{product.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );

  const renderProductDetail = () => {
    if (!selectedProduct) return null;

    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <button 
          onClick={() => setView('home')}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-8 font-bold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao catálogo
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="relative aspect-square md:aspect-auto md:h-[600px] rounded-[40px] overflow-hidden shadow-2xl border border-slate-100">
            <img 
              src={selectedProduct.imageUrl} 
              alt={selectedProduct.name} 
              className="w-full h-full object-cover"
            />
            {selectedProduct.stock < 10 && (
              <div className="absolute top-6 right-6 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg">
                ESTOQUE BAIXO
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col justify-center">
            <div className="mb-6">
              <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold mb-4 uppercase tracking-widest">
                {selectedProduct.category === 'fruits' ? 'Frutas' : selectedProduct.category === 'vegetables' ? 'Verduras' : selectedProduct.category === 'legumes' ? 'Legumes' : 'Naturais'}
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4">{selectedProduct.name}</h1>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-1.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      fill={i < Math.floor(selectedProduct.rating) ? "currentColor" : "none"} 
                      className={i < Math.floor(selectedProduct.rating) ? "" : "text-slate-200"}
                    />
                  ))}
                  <span className="ml-2 text-sm font-bold text-slate-600">{selectedProduct.rating} ({selectedProduct.reviewsCount} avaliações)</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-black text-emerald-700">R$ {selectedProduct.price.toFixed(2)}</span>
                <span className="text-lg text-slate-400 font-medium tracking-tight">/{selectedProduct.unit}</span>
              </div>

              <p className="text-slate-500 text-lg leading-relaxed mb-10 pb-8 border-b border-slate-100">
                {selectedProduct.description}
                <br /><br />
                Nossos produtos são selecionados diariamente para garantir que você receba apenas o melhor em sua casa. Rico em vitaminas e minerais, ideal para uma dieta equilibrada.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => addToCart(selectedProduct)}
                  className="flex-1 bg-emerald-600 text-white py-5 px-8 rounded-3xl font-black text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center justify-center gap-3"
                >
                  <ShoppingCart size={24} />
                  Adicionar ao Carrinho
                </button>
                
                <button className="p-5 border-2 border-slate-100 text-slate-400 rounded-3xl hover:border-emerald-200 hover:text-emerald-600 transition-all group">
                  <Star size={24} className="group-hover:fill-current" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <Truck size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Entrega em</p>
                <p className="text-xs font-bold text-slate-800">Até 2 horas</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Garantia</p>
                <p className="text-xs font-bold text-slate-800">100% Fresco</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <Clock size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Colheita</p>
                <p className="text-xs font-bold text-slate-800">Do Dia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products Placeholder */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-8">Quem viu este produto também comprou</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 5).map(product => (
              <div 
                key={product.id} 
                onClick={() => {
                  setSelectedProduct(product);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{product.name}</h3>
                <p className="text-emerald-700 font-bold text-sm">R$ {product.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  };

  const renderCart = () => (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-extrabold text-slate-800">Carrinho de Compras</h1>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <ShoppingBasket size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Seu carrinho está vazio</h2>
          <p className="text-slate-500 mb-8">Que tal adicionar alguns produtos frescos?</p>
          <button 
            onClick={() => setView('home')}
            className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition-colors"
          >
            Começar a Comprar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <p className="text-sm text-slate-400">R$ {item.price.toFixed(2)} / {item.unit}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"><Minus size={16} /></button>
                  <span className="w-8 text-center font-bold text-slate-700">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"><Plus size={16} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200"><Sparkles size={20} /></div>
                <div><h4 className="font-bold text-emerald-900">Assistente Smart Horti</h4><p className="text-sm text-emerald-700">Sugestão de receita com base no seu carrinho</p></div>
              </div>
              {aiSuggestion ? (
                <div className="bg-white/60 backdrop-blur p-4 rounded-xl border border-emerald-200 text-sm text-emerald-800 animate-in fade-in slide-in-from-bottom-2 duration-500 whitespace-pre-wrap">{aiSuggestion}<button onClick={() => setAiSuggestion(null)} className="block mt-4 text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-800">Limpar Sugestão</button></div>
              ) : (
                <button onClick={fetchAiRecipe} disabled={isLoading} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">{isLoading ? 'Pensando em uma receita...' : 'Gerar Receita Saudável'}</button>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Resumo</h2>
              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold">R$ {cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Entrega</span><span className={shipping === 0 ? "text-emerald-600 font-bold" : "font-semibold"}>{shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}</span></div>
                {appliedCoupon && (<div className="flex justify-between text-emerald-600 font-medium"><span>Cupom (10%)</span><span>- R$ {discount.toFixed(2)}</span></div>)}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center"><span className="text-base font-bold text-slate-800">Total</span><span className="text-2xl font-black text-emerald-700">R$ {finalTotal.toFixed(2)}</span></div>
              </div>
              <button onClick={() => setView('checkout')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:scale-[1.02] active:scale-95">Finalizar Compra</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  const renderCheckout = () => (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('cart')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-extrabold text-slate-800">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Method Choice */}
          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Truck size={20} className="text-emerald-600" /> Entrega ou Retirada?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setDeliveryType('delivery')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${deliveryType === 'delivery' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'}`}
              >
                <Truck size={24} className="mb-2" />
                <span className="font-bold text-sm">Delivery</span>
                <span className="text-[10px] opacity-70">Em até 2h</span>
              </button>
              <button 
                onClick={() => setDeliveryType('pickup')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${deliveryType === 'pickup' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'}`}
              >
                <ShoppingBasket size={24} className="mb-2" />
                <span className="font-bold text-sm">Retirada</span>
                <span className="text-[10px] opacity-70">Grátis</span>
              </button>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserIcon size={20} className="text-emerald-600" /> Dados de Contato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={address.fullName}
                  onChange={(e) => setAddress({...address, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">WhatsApp (com DDD)</label>
                <input 
                  type="text" 
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={address.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (value.length > 0) {
                      value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
                      value = value.replace(/(\d)(\d{4})$/, "$1-$2");
                    }
                    if (value.length > 15) value = value.substring(0, 15);
                    setAddress({...address, phone: value});
                  }}
                />
              </div>
            </div>
          </section>

          {/* Address Form (Only for delivery) */}
          {deliveryType === 'delivery' && (
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-emerald-600" /> Endereço de Entrega
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">CEP</label>
                  <input 
                    type="text" 
                    placeholder="00000-000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.zipCode}
                    onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Rua</label>
                  <input 
                    type="text" 
                    placeholder="Av. Brasil, Rua das Flores..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.street}
                    onChange={(e) => setAddress({...address, street: e.target.value})}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Número</label>
                  <input 
                    type="text" 
                    placeholder="123, s/n, Ap 42..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.number}
                    onChange={(e) => setAddress({...address, number: e.target.value})}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Bairro</label>
                  <input 
                    type="text" 
                    placeholder="Centro, Jardim América..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.neighborhood}
                    onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Cidade</label>
                  <input 
                    type="text" 
                    placeholder="São Paulo, Curitiba..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.city}
                    onChange={(e) => setAddress({...address, city: e.target.value})}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Estado</label>
                  <input 
                    type="text" 
                    placeholder="SP, RJ, MG..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={address.state}
                    onChange={(e) => setAddress({...address, state: e.target.value})}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-emerald-600" /> Agendamento
            </h2>
            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
              <option>Hoje (Agora - Entrega Rápida)</option>
              <option>Hoje (18:00 - 20:00)</option>
              <option>Amanhã (08:00 - 10:00)</option>
              <option>Amanhã (14:00 - 16:00)</option>
            </select>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Forma de Pagamento</h2>
            <div className="space-y-3">
              <label 
                className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                onClick={() => setPaymentMethod('pix')}
              >
                <input type="radio" name="payment" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} className="accent-emerald-600 w-5 h-5" />
                <div className="flex-1">
                  <p className={`font-bold ${paymentMethod === 'pix' ? 'text-emerald-900' : 'text-slate-700'}`}>Pix Instantâneo</p>
                  <p className={`text-xs ${paymentMethod === 'pix' ? 'text-emerald-600' : 'text-slate-400'}`}>Liberação imediata &bull; Ganhe 5% de desconto</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 text-xs font-black italic shadow-sm border border-emerald-100">PIX</div>
              </label>
              <label 
                className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                onClick={() => setPaymentMethod('credit_card')}
              >
                <input type="radio" name="payment" checked={paymentMethod === 'credit_card'} onChange={() => setPaymentMethod('credit_card')} className="accent-emerald-600 w-5 h-5" />
                <div className="flex-1">
                  <p className={`font-bold ${paymentMethod === 'credit_card' ? 'text-emerald-900' : 'text-slate-700'}`}>Cartão de Crédito</p>
                  <p className={`text-xs ${paymentMethod === 'credit_card' ? 'text-emerald-600' : 'text-slate-400'}`}>Pague direto no app</p>
                </div>
                <CreditCard size={24} className={paymentMethod === 'credit_card' ? 'text-emerald-600' : 'text-slate-300'} />
              </label>
            </div>
          </section>
        </div>

        <div className="bg-emerald-900 text-white p-8 rounded-[40px] shadow-2xl h-fit sticky top-24">
          <h2 className="text-2xl font-bold mb-8">Resumo Final</h2>
          <div className="space-y-4 mb-8 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b border-emerald-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-emerald-700 text-[10px] font-bold rounded flex items-center justify-center">{item.quantity}x</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-emerald-300 text-sm">
              <span>Subtotal</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between text-emerald-300 text-sm">
                <span>Taxa de Entrega</span>
                <span>R$ {shipping.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-lime-400 text-sm font-bold">
                <span>Desconto Cupom</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black pt-4 border-t border-emerald-700">
              <span>Total</span>
              <span>R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={handlePlaceOrder}
            className="w-full py-5 bg-white text-emerald-900 rounded-3xl font-black text-lg hover:bg-lime-400 hover:scale-[1.02] transition-all shadow-xl shadow-emerald-950/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <QrCode size={20} /> Finalizar e Gerar PIX
          </button>
          
          <p className="text-[10px] text-emerald-400 text-center mt-6 uppercase tracking-widest font-bold opacity-60">
            Segurança Garantida por HortiFresh SSL
          </p>
        </div>
      </div>
    </main>
  );

  const renderPaymentQR = () => (
    <main className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-white p-8 md:p-12 rounded-[50px] shadow-2xl border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
          <QrCode size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-2">Quase lá!</h1>
        <p className="text-slate-500 mb-8">Escaneie o QR Code abaixo para pagar via PIX e confirmar seu pedido.</p>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 flex flex-col items-center">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=hortifresh-payment-demo-${lastOrder?.id}`} 
            alt="PIX QR Code" 
            className="w-64 h-64 rounded-xl shadow-lg border-4 border-white mb-6"
          />
          <div className="w-full space-y-3">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código Pix "Copia e Cola"</p>
             <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="flex-1 text-[10px] text-slate-600 font-mono truncate">00020126360014BR.GOV.BCB.PIX011400000000000000{lastOrder?.id}</span>
                <button 
                  onClick={copyPixCode}
                  className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                  title="Copiar código PIX"
                >
                  <Copy size={16} />
                </button>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm py-4 border-t border-slate-100">
            <span className="text-slate-400 font-medium">Total a pagar:</span>
            <span className="text-2xl font-black text-emerald-700">R$ {lastOrder?.total.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setView('orders')}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
          >
            Já realizei o pagamento
          </button>
          <button 
            onClick={() => setView('home')}
            className="text-slate-400 text-xs font-bold uppercase hover:text-slate-600 transition-colors"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-4 text-slate-400">
        <CheckCircle2 size={16} className="text-emerald-500" />
        <span className="text-xs font-medium">Pedido #{lastOrder?.id} • Aguardando Pagamento</span>
      </div>
    </main>
  );

  const renderDashboardOrders = () => (
    <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Truck size={20} className="text-emerald-600" /> Linha de Preparação
        </h2>
        <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold">
          {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length} Pedidos Ativos
        </span>
      </div>
      <div className="space-y-4">
        {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
          <div key={order.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-600">#{order.id}</span>
                <span className="text-xs text-slate-400">• {new Date(order.date).toLocaleTimeString()}</span>
              </div>
              <h4 className="font-bold text-slate-800">{order.items.length} itens • R$ {order.total.toFixed(2)}</h4>
              <p className="text-xs text-slate-500 mt-1">
                {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select 
                value={order.status}
                onChange={async (e) => {
                  await api.updateOrderStatus(order.id, e.target.value as any);
                  fetchOrders();
                  fetchAdminStats();
                }}
                className={`text-xs font-bold py-2 px-4 rounded-xl border transition-all ${
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  order.status === 'preparing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  order.status === 'delivering' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                  'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
              >
                <option value="pending">Pendente</option>
                <option value="preparing">Preparando</option>
                <option value="delivering">Em Entrega</option>
                <option value="delivered">Entregue</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <button 
                onClick={() => sendWhatsAppMessage(order)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                title="Enviar resumo para o WhatsApp do cliente"
              >
                <div className="bg-white/20 p-1 rounded-md">
                  <MessageCircle size={14} />
                </div>
                WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderProductModal = () => {
    if (!showProductModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800">
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <button 
              onClick={() => setShowProductModal(false)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Produto</label>
                  <input 
                    type="text" 
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Ex: Alface Americana Fresca"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Preço (R$)</label>
                    <input 
                      type="number" 
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unidade</label>
                    <select 
                      value={productForm.unit}
                      onChange={(e) => setProductForm({...productForm, unit: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="kg">Quilo (kg)</option>
                      <option value="un">Unidade (un)</option>
                      <option value="maço">Maço</option>
                      <option value="bdj">Bandeja</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                  <select 
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value="fruits">Frutas</option>
                    <option value="vegetables">Verduras</option>
                    <option value="legumes">Legumes</option>
                    <option value="natural">Naturais</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estoque Inicial</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Descrição</label>
                    <button 
                      onClick={handleGenerateAiDescription}
                      disabled={isLoading || !productForm.name}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles size={12} /> Gerar com IA
                    </button>
                  </div>
                  <textarea 
                    rows={6}
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Descreva o produto..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4">
            <button 
              onClick={() => setShowProductModal(false)}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveProduct}
              disabled={isLoading || !productForm.name || !productForm.price}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-50 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {isLoading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!showDeleteModal || !productToDelete) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trash2 size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Produto?</h3>
          <p className="text-slate-500 text-sm mb-8">
            Tem certeza que deseja excluir <strong>{productToDelete.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
              className="py-4 px-6 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteProduct}
              disabled={isLoading}
              className="py-4 px-6 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
            >
              {isLoading ? 'Excluindo...' : 'Sim, Excluir'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSettings) return;
    setIsLoading(true);
    try {
      await api.updateStoreSettings(storeSettings);
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfile = () => {
    if (!currentUser) return renderLogin();

    return (
      <main className="max-w-4xl mx-auto px-4 py-12 pb-32">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => setView('home')}
            className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Minha Conta</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Menu Lateral */}
          <div className="col-span-1 space-y-2">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{currentUser.name}</h3>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
              </div>
            </div>
            
            <button className="w-full flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold transition-all">
              <UserIcon size={18} /> Dados Pessoais
            </button>
            <button onClick={() => setView('orders')} className="w-full flex items-center gap-3 px-6 py-4 text-slate-400 hover:bg-slate-50 rounded-2xl font-bold transition-all">
              <Package size={18} /> Meus Pedidos
            </button>
            <button onClick={() => { setCurrentUser(null); setView('home'); }} className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-50 rounded-2xl font-bold transition-all">
              <LogOut size={18} /> Sair
            </button>
          </div>

          {/* Conteúdo Principal */}
          <div className="col-span-2">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
              <h2 className="text-lg font-black text-slate-800 mb-8">Editar Perfil</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  cpf: formData.get('cpf') as string,
                };
                handleUpdateProfile(data);
              }} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome Completo</label>
                  <input 
                    name="name"
                    type="text" 
                    defaultValue={currentUser.name}
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CPF</label>
                    <input 
                      name="cpf"
                      type="text" 
                      defaultValue={currentUser.cpf}
                      placeholder="000.000.000-00"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Telefone</label>
                    <input 
                      name="phone"
                      type="tel" 
                      defaultValue={currentUser.phone}
                      placeholder="(00) 00000-0000"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Endereço de Entrega</label>
                  <textarea 
                    name="address"
                    defaultValue={currentUser.address}
                    rows={3}
                    placeholder="Rua, número, complemento, bairro..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  };

  const renderAdmin = () => {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-500">Gestão de vendas, estoque e produtos</p>
          </div>
          <button 
            onClick={openAddProduct}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus size={20} /> Novo Produto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><TrendingUp size={24} /></div>
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vendas Totais</p><h3 className="text-xl font-black text-slate-800">R$ {adminStats?.totalSales.toFixed(2) || '0.00'}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Package size={24} /></div>
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pedidos</p><h3 className="text-xl font-black text-slate-800">{adminStats?.totalOrders || 0}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><ShoppingBasket size={24} /></div>
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estoque Baixo</p><h3 className="text-xl font-black text-slate-800">{adminStats?.lowStock || 0}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><UserIcon size={24} /></div>
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Produtos</p><h3 className="text-xl font-black text-slate-800">{adminStats?.totalProducts || 0}</h3></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-emerald-600" /> Relatório de Vendas (7 Dias)</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adminStats?.dailySales || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            
            {renderDashboardOrders()}

            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Settings size={20} className="text-emerald-600" /> Configurações da Loja
              </h2>
              {storeSettings && (
                <form onSubmit={handleSaveStoreSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome da Empresa</label>
                      <input 
                        type="text" 
                        value={storeSettings.storeName}
                        onChange={(e) => setStoreSettings({...storeSettings, storeName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CNPJ / CPF</label>
                      <input 
                        type="text" 
                        value={storeSettings.cnpj}
                        onChange={(e) => setStoreSettings({...storeSettings, cnpj: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Telefone Comercial</label>
                      <input 
                        type="text" 
                        value={storeSettings.phone}
                        onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Número WhatsApp (Pedidos)</label>
                      <input 
                        type="text" 
                        value={storeSettings.whatsappNumber}
                        onChange={(e) => setStoreSettings({...storeSettings, whatsappNumber: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700">Endereço Fiscal/Comercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Endereço Completo</label>
                        <input 
                          type="text" 
                          value={storeSettings.address}
                          onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CEP</label>
                        <input 
                          type="text" 
                          value={storeSettings.cep}
                          onChange={(e) => setStoreSettings({...storeSettings, cep: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cidade</label>
                        <input 
                          type="text" 
                          value={storeSettings.city}
                          onChange={(e) => setStoreSettings({...storeSettings, city: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estado</label>
                        <input 
                          type="text" 
                          value={storeSettings.state}
                          onChange={(e) => setStoreSettings({...storeSettings, state: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-50 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package size={20} className="text-emerald-600" /> Gerenciar Produtos</h2>
                <button 
                  onClick={openAddProduct}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-4 font-bold text-slate-400 text-xs uppercase">Produto</th>
                      <th className="pb-4 font-bold text-slate-400 text-xs uppercase">Estoque</th>
                      <th className="pb-4 font-bold text-slate-400 text-xs uppercase">Preço</th>
                      <th className="pb-4 font-bold text-slate-400 text-xs uppercase">Status</th>
                      <th className="pb-4 font-bold text-slate-400 text-xs uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className="font-bold text-slate-700 leading-tight">{p.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm font-medium text-slate-600">{p.stock} {p.unit}</td>
                        <td className="py-4 text-sm font-bold text-emerald-600">R$ {p.price.toFixed(2)}</td>
                        <td className="py-4"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.stock > 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{p.stock > 10 ? 'EM DIA' : 'CRÍTICO'}</span></td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => confirmDeleteProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          
          <div className="space-y-8">
            <section className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl">
              <h2 className="text-xl font-bold mb-4">Destaques</h2>
              <p className="text-emerald-200 text-sm mb-6">Aqui você pode visualizar informações rápidas sobre o desempenho da loja.</p>
              <div className="space-y-4">
                <div className="p-4 bg-emerald-800/50 rounded-2xl border border-emerald-700">
                  <p className="text-xs uppercase font-bold text-emerald-400 mb-1">Ticket Médio</p>
                  <h4 className="text-2xl font-black">R$ {(adminStats?.totalSales / (adminStats?.totalOrders || 1)).toFixed(2)}</h4>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  };

  const renderOrders = () => (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-3xl font-extrabold text-slate-800">Meus Pedidos</h1>
        </div>
        {orders.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} /> Limpar Histórico
          </button>
        )}
      </div>
      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <Package size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">Você ainda não realizou nenhum pedido nos últimos 6 meses.</p>
            <button onClick={() => setView('home')} className="text-emerald-600 font-bold hover:underline">Ir para as compras</button>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group">
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedido #{order.id}</p><p className="text-sm font-bold text-slate-700">{new Date(order.date).toLocaleDateString()}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-bold text-xs">
                    <Clock size={14} /> 
                    {order.status === 'pending' ? 'Pendente' : 
                     order.status === 'preparing' ? 'Preparando' : 
                     order.status === 'delivering' ? 'Em Entrega' :
                     order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                  </div>
                  <button 
                    onClick={() => handleDeleteOrder(order.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir do histórico"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {order.address && (
                  <div className="mb-4 flex items-start gap-2 text-slate-500 text-xs">
                    <MapPin size={14} />
                    <span>Entregar em: {order.address.street}, {order.address.number} - {order.address.city}/{order.address.state}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 4).map(item => (<img key={item.id} src={item.imageUrl} className="w-10 h-10 rounded-full border-2 border-white object-cover" />))}
                    {order.items.length > 4 && (<div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">+{order.items.length - 4}</div>)}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{order.items.length} itens</p>
                    <p className="text-xl font-black text-emerald-700">R$ {order.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );

  const renderLogin = () => {
    if (verificationUserId) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-800">Verificação</h1>
              <p className="text-slate-500">Digite o código de 6 dígitos que enviamos para você (veja o console do navegador)</p>
            </div>
            
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Código de Verificação</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="000000"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Verificando...' : 'Confirmar Código'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setVerificationUserId(null)}
                className="text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
              <ShoppingBasket size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              {isRegisterMode ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-slate-500">
              {isRegisterMode ? 'Cadastre-se para começar a comprar' : 'Entre para continuar suas compras'}
            </p>
          </div>
          
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
            {isRegisterMode && (
              <>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CPF</label>
                  <input 
                    type="text" 
                    required
                    value={authCpf}
                    onChange={(e) => setAuthCpf(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{isRegisterMode ? 'E-mail' : 'E-mail ou CPF'}</label>
              <input 
                type="text" 
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                placeholder={isRegisterMode ? "seu@email.com" : "E-mail ou CPF"}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Senha</label>
              <input 
                type="password" 
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Aguarde...' : (isRegisterMode ? 'Cadastrar' : 'Entrar')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              {isRegisterMode ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
            </button>
          </div>

          {!isRegisterMode && (
            <div className="mt-10 pt-8 border-t border-slate-50 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Acesso Administrativo</p>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-400">Email: admin@hortifresh.com</p>
                <p className="text-xs text-slate-400">Senha: admin123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {isLoading && <LoadingOverlay />}
      {renderHeader()}
      
      <div className="animate-in fade-in duration-700">
        {view === 'home' && renderHome()}
        {view === 'product-detail' && renderProductDetail()}
        {view === 'cart' && renderCart()}
        {view === 'checkout' && renderCheckout()}
        {view === 'admin' && renderAdmin()}
        {view === 'orders' && renderOrders()}
        {view === 'profile' && renderProfile()}
        {view === 'login' && renderLogin()}
        {view === 'payment-qr' && renderPaymentQR()}
      </div>

      {renderProductModal()}
      {renderDeleteModal()}

      {cart.length > 0 && view === 'home' && (
        <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden">
          <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl shadow-emerald-500/40 transform active:scale-95 transition-transform"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">{cart.length}</div><span className="font-black text-sm uppercase tracking-wider">Ver meu Carrinho</span></div><span className="font-black">R$ {cartTotal.toFixed(2)}</span></button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-3 flex justify-around items-center md:hidden z-30 shadow-2xl">
        <button onClick={() => setView('home')} className={`p-2 rounded-xl transition-colors ${view === 'home' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}><ShoppingBasket size={24} /></button>
        <button onClick={() => setView('orders')} className={`p-2 rounded-xl transition-colors ${view === 'orders' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}><Package size={24} /></button>
        <button onClick={() => setView('cart')} className={`p-2 rounded-xl transition-colors ${view === 'cart' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}><ShoppingCart size={24} /></button>
        <button onClick={() => setView(currentUser ? 'profile' : 'login')} className={`p-2 rounded-xl transition-colors ${view === 'login' || view === 'profile' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}><UserIcon size={24} /></button>
      </nav>

      <footer className="hidden md:block bg-slate-900 text-white py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 space-y-6">
              <div className="flex items-center gap-2"><div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><ShoppingBasket size={24} /></div><span className="text-xl font-bold">{storeSettings?.storeName || 'HortiFresh'}</span></div>
              <p className="text-slate-400 text-sm leading-relaxed">Levar saúde para sua mesa é nossa missão. Produtos frescos, selecionados e entregues com todo carinho.</p>
            </div>
            <div><h4 className="font-bold mb-6 text-emerald-400">Institucional</h4><ul className="space-y-4 text-sm text-slate-400"><li className="hover:text-white cursor-pointer transition-colors">Quem Somos</li><li className="hover:text-white cursor-pointer transition-colors">Nossos Produtores</li></ul></div>
            <div><h4 className="font-bold mb-6 text-emerald-400">Ajuda</h4><ul className="space-y-4 text-sm text-slate-400"><li className="hover:text-white cursor-pointer transition-colors">Fale Conosco</li><li className="hover:text-white cursor-pointer transition-colors">Perguntas Frequentes</li></ul></div>
            <div><h4 className="font-bold mb-6 text-emerald-400">Newsletter</h4><p className="text-sm text-slate-400 mb-4">Receba nossas ofertas e dicas saudáveis semanalmente.</p><div className="flex gap-2"><input type="email" placeholder="Seu e-mail" className="bg-slate-800 border-none rounded-xl px-4 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-500" /><button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">OK</button></div></div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
            <div>
              <p>&copy; 2024 {storeSettings?.storeName || 'HortiFresh Online Service Ltda.'}</p>
              {storeSettings?.cnpj && <p className="mt-1">CNPJ: {storeSettings.cnpj}</p>}
            </div>
            <div className="flex gap-8"><span>Siga-nos: Instagram &bull; Facebook</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
