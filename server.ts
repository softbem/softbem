import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import db from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { id, name, description, price, unit, category, imageUrl, stock, rating, reviewsCount } = req.body;
    db.prepare(`
      INSERT INTO products (id, name, description, price, unit, category, imageUrl, stock, rating, reviewsCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, price, unit, category, imageUrl, stock, rating, reviewsCount);
    res.status(201).json({ id });
  });

  app.put('/api/products/:id', (req, res) => {
    const { name, description, price, unit, category, imageUrl, stock } = req.body;
    db.prepare(`
      UPDATE products SET name = ?, description = ?, price = ?, unit = ?, category = ?, imageUrl = ?, stock = ?
      WHERE id = ?
    `).run(name, description, price, unit, category, imageUrl, stock, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Users / Auth
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    // Login with email or CPF
    const user = db.prepare('SELECT * FROM users WHERE (email = ? OR cpf = ?)').get(email, email) as any;
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'E-mail/CPF ou senha incorretos' });
    }

    if (user.role === 'customer' && !user.isVerified) {
      return res.status(403).json({ 
        message: 'Conta não verificada. Por favor, insira o código enviado.',
        needsVerification: true,
        userId: user.id
      });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post('/api/register', (req, res) => {
    const { name, email, password, cpf } = req.body;
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR cpf = ?').get(email, cpf);
    if (existing) {
      return res.status(400).json({ message: 'E-mail ou CPF já cadastrado' });
    }

    const id = 'user-' + Math.random().toString(36).substr(2, 9);
    try {
      db.prepare('INSERT INTO users (id, name, email, password, cpf, role) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, name, email, password, cpf, 'customer'
      );
      
      // Generate 6 digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      db.prepare('INSERT INTO verification_codes (userId, code) VALUES (?, ?)').run(id, code);
      
      console.log(`[AUTH] Código de verificação para ${email}: ${code}`); // Mocking sending code
      
      res.status(201).json({ 
        userId: id, 
        message: 'Cadastro realizado. Verifique seu e-mail para o código de ativação.',
        needsVerification: true
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Erro ao criar usuário' });
    }
  });

  app.post('/api/verify', (req, res) => {
    const { userId, code } = req.body;
    const record = db.prepare('SELECT * FROM verification_codes WHERE userId = ? AND code = ? ORDER BY expiresAt DESC').get(userId, code) as any;
    
    if (!record) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    db.prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(userId);
    db.prepare('DELETE FROM verification_codes WHERE userId = ?').run(userId);
    
    const user = db.prepare('SELECT id, name, email, cpf, role, isVerified FROM users WHERE id = ?').get(userId);
    res.json(user);
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, address, cpf } = req.body;
    
    try {
      db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, cpf = ? WHERE id = ?').run(
        name, phone, address, cpf, id
      );
      const updatedUser = db.prepare('SELECT id, name, email, role, phone, address, cpf, isVerified FROM users WHERE id = ?').get(id);
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
  });

  // Orders
  app.get('/api/orders', (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY date DESC').all();
    const ordersWithItems = orders.map((order: any) => {
      const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
      return { 
        ...order, 
        items,
        address: order.address ? JSON.parse(order.address) : undefined
      };
    });
    res.json(ordersWithItems);
  });

  app.post('/api/orders', (req, res) => {
    const { id, userId, total, status, date, paymentMethod, deliveryType, address, items } = req.body;
    
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, userId, total, status, date, paymentMethod, deliveryType, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertItem = db.prepare(`
      INSERT INTO order_items (orderId, productId, name, price, quantity, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertOrder.run(id, userId, total, status, date, paymentMethod, deliveryType, address ? JSON.stringify(address) : null);
      for (const item of items) {
        insertItem.run(id, item.id, item.name, item.price, item.quantity, item.imageUrl);
        // Decrease stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
      }
    });

    transaction();
    res.status(201).json({ id });
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/users/:userId/orders', (req, res) => {
    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE userId = ? 
      AND date >= date('now', '-6 months')
      ORDER BY date DESC
    `).all(req.params.userId);

    const ordersWithItems = orders.map((order: any) => {
      const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
      return { 
        ...order, 
        items,
        address: order.address ? JSON.parse(order.address) : undefined
      };
    });
    res.json(ordersWithItems);
  });

  app.delete('/api/orders/:id', (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM order_items WHERE orderId = ?').run(req.params.id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  app.delete('/api/users/:userId/orders', (req, res) => {
    const transaction = db.transaction(() => {
      const orders = db.prepare('SELECT id FROM orders WHERE userId = ?').all(req.params.userId) as { id: string }[];
      for (const order of orders) {
        db.prepare('DELETE FROM order_items WHERE orderId = ?').run(order.id);
      }
      db.prepare('DELETE FROM orders WHERE userId = ?').run(req.params.userId);
    });
    transaction();
    res.json({ success: true });
  });

  // Stats for Dashboard
  app.get('/api/admin/stats', (req, res) => {
    const totalSales = db.prepare('SELECT SUM(total) as total FROM orders WHERE status != "cancelled"').get() as any;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10').get() as any;
    
    // Daily sales for last 7 days
    const dailySales = db.prepare(`
      SELECT date(date) as day, SUM(total) as amount 
      FROM orders 
      WHERE date >= date('now', '-7 days') AND status != 'cancelled'
      GROUP BY day
      ORDER BY day
    `).all();

    res.json({
      totalSales: totalSales.total || 0,
      totalOrders: totalOrders.count,
      totalProducts: totalProducts.count,
      lowStock: lowStock.count,
      dailySales
    });
  });

  app.get('/api/store-settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
    res.json(settings);
  });

  app.post('/api/admin/store-settings', (req, res) => {
    const { storeName, cnpj, address, phone, whatsappNumber, cep, city, state } = req.body;
    db.prepare(`
      UPDATE store_settings 
      SET storeName = ?, cnpj = ?, address = ?, phone = ?, whatsappNumber = ?, cep = ?, city = ?, state = ?
      WHERE id = 1
    `).run(storeName, cnpj, address, phone, whatsappNumber, cep, city, state);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return app;
}

export const app = startServer();
export default app;
