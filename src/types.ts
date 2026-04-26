
export type UnitType = 'kg' | 'g' | 'unidade';

export interface Address {
  fullName: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: UnitType;
  category: 'fruits' | 'vegetables' | 'legumes' | 'natural';
  imageUrl: string;
  stock: number;
  rating: number;
  reviewsCount: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  isVerified?: boolean;
  role: 'customer' | 'admin';
  phone?: string;
  address?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  date: string;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  deliveryType: 'delivery' | 'pickup';
  address?: Address;
  scheduledTime?: string;
}

export interface Coupon {
  code: string;
  discount: number; // percentage
  expiryDate: string;
}

export interface SaleRecord {
  date: string;
  amount: number;
}

export interface StoreSettings {
  id: number;
  storeName: string;
  cnpj: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  cep: string;
  city: string;
  state: string;
}
