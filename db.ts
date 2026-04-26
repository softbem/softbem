import Database from 'better-sqlite3';
import { Product, Order, User } from './src/types.ts';
import { INITIAL_PRODUCTS } from './src/constants.tsx';

const dbName = process.env.DB_NAME || 'hortifresh.db';
const db = new Database(dbName);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    imageUrl TEXT,
    stock INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    reviewsCount INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    cpf TEXT UNIQUE,
    isVerified INTEGER DEFAULT 0,
    role TEXT DEFAULT 'customer'
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    code TEXT NOT NULL,
    expiresAt DATETIME DEFAULT (datetime('now', '+15 minutes')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    deliveryType TEXT NOT NULL,
    address TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId TEXT NOT NULL,
    productId TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    imageUrl TEXT,
    FOREIGN KEY (orderId) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    storeName TEXT DEFAULT 'Hortifresh Online',
    cnpj TEXT,
    address TEXT,
    phone TEXT,
    whatsappNumber TEXT,
    cep TEXT,
    city TEXT,
    state TEXT
  );

  INSERT OR IGNORE INTO store_settings (id, storeName) VALUES (1, 'Hortifresh Online');
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN password TEXT;');
} catch (e) {}

// Seed products if empty
const count = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
if (count.count === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, description, price, unit, category, imageUrl, stock, rating, reviewsCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of INITIAL_PRODUCTS) {
    insertProduct.run(p.id, p.name, p.description, p.price, p.unit, p.category, p.imageUrl, p.stock, p.rating, p.reviewsCount);
  }
}

// Seed admin user if not exists
const adminEmail = 'admin@hortifresh.com';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
    'admin-1', 'Administrador', adminEmail, 'admin123', 'admin'
  );
}

export default db;
