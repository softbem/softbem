
import { Product, Order, User, StoreSettings } from '../types';

const API_BASE = '/api';

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    return res.json();
  },
  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
  },
  async deleteProduct(id: string): Promise<void> {
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
  },
  async createProduct(product: Product): Promise<void> {
    await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
  },

  // Auth
  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      const error = new Error(err.message || 'Erro ao fazer login') as any;
      error.userId = err.userId;
      error.needsVerification = err.needsVerification;
      throw error;
    }
    return res.json();
  },
  async register(userData: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erro ao cadastrar');
    }
    return res.json();
  },
  async verifyCode(userId: string, code: string): Promise<User> {
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Código inválido');
    }
    return res.json();
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`);
    return res.json();
  },
  async placeOrder(order: Order): Promise<void> {
    await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  },
  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },
  async getUserOrders(userId: string): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/users/${userId}/orders`);
    return res.json();
  },
  async deleteOrder(id: string): Promise<void> {
    await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
  },
  async clearUserHistory(userId: string): Promise<void> {
    await fetch(`${API_BASE}/users/${userId}/orders`, { method: 'DELETE' });
  },

  // Settings
  async getStoreSettings(): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/store-settings`);
    return res.json();
  },
  async updateStoreSettings(settings: StoreSettings): Promise<void> {
    await fetch(`${API_BASE}/admin/store-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  // Stats
  async getAdminStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/stats`);
    return res.json();
  }
};
