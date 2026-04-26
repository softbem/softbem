
import { Product, Coupon } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Banana Prata Premium',
    description: 'Bananas frescas e doces, colhidas no ponto certo.',
    price: 6.99,
    unit: 'kg',
    category: 'fruits',
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ad99026.jpg?auto=format&fit=crop&q=80&w=400',
    stock: 150,
    rating: 4.8,
    reviewsCount: 124,
  },
  {
    id: '2',
    name: 'Maçã Gala Importada',
    description: 'Crocantes e suculentas, perfeitas para um lanche saudável.',
    price: 12.50,
    unit: 'kg',
    category: 'fruits',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?auto=format&fit=crop&q=80&w=400',
    stock: 80,
    rating: 4.5,
    reviewsCount: 89,
  },
  {
    id: '3',
    name: 'Alface Crespa Orgânica',
    description: 'Folhas verdes e crocantes, cultivadas sem agrotóxicos.',
    price: 3.50,
    unit: 'unidade',
    category: 'vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1622206141540-5845144bca18?auto=format&fit=crop&q=80&w=400',
    stock: 45,
    rating: 4.9,
    reviewsCount: 56,
  },
  {
    id: '4',
    name: 'Tomate Italiano',
    description: 'Ideais para molhos ou saladas frescas.',
    price: 8.90,
    unit: 'kg',
    category: 'legumes',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?auto=format&fit=crop&q=80&w=400',
    stock: 120,
    rating: 4.6,
    reviewsCount: 210,
  },
  {
    id: '5',
    name: 'Castanha do Pará',
    description: 'Fonte natural de selênio e gorduras boas.',
    price: 15.00,
    unit: 'g', // Treated as 100g unit in code logic or similar
    category: 'natural',
    imageUrl: 'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?auto=format&fit=crop&q=80&w=400',
    stock: 200,
    rating: 4.7,
    reviewsCount: 45,
  },
  {
    id: '6',
    name: 'Cenoura Especial',
    description: 'Cenouras doces e ricas em betacaroteno.',
    price: 4.50,
    unit: 'kg',
    category: 'legumes',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400',
    stock: 300,
    rating: 4.4,
    reviewsCount: 78,
  },
];

export const MOCK_COUPONS: Coupon[] = [
  { code: 'BEMVINDO10', discount: 10, expiryDate: '2025-12-31' },
  { code: 'FRESCO20', discount: 20, expiryDate: '2025-12-31' },
];

export const SHIPPING_RATE = 7.50;
export const FREE_SHIPPING_THRESHOLD = 150.00;
