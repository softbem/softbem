-- MySQL Schema for Hortifresh Online
-- Generated for local MySQL environment

CREATE DATABASE IF NOT EXISTS hortifresh;
USE hortifresh;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    imageUrl TEXT,
    stock INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    reviewsCount INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    isVerified BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'customer'
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expiresAt DATETIME DEFAULT (DATE_ADD(NOW(), INTERVAL 15 MINUTE)),
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    date DATETIME NOT NULL,
    paymentMethod VARCHAR(50) NOT NULL,
    deliveryType VARCHAR(50) NOT NULL,
    address TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId VARCHAR(255) NOT NULL,
    productId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    imageUrl TEXT,
    FOREIGN KEY (orderId) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY,
    storeName VARCHAR(255) DEFAULT 'Hortifresh Online',
    cnpj VARCHAR(20),
    address TEXT,
    phone VARCHAR(20),
    whatsappNumber VARCHAR(20),
    cep VARCHAR(10),
    city VARCHAR(100),
    state VARCHAR(50),
    CONSTRAINT store_settings_id_check CHECK (id = 1)
);

-- Seed initial store settings
INSERT IGNORE INTO store_settings (id, storeName) VALUES (1, 'Hortifresh Online');

-- Seed admin user
-- NOTE: Password is 'admin123' in plaintext as requested/implemented in original app. 
-- In production, passwords should always be hashed.
INSERT IGNORE INTO users (id, name, email, password, role) 
VALUES ('admin-1', 'Administrador', 'admin@hortifresh.com', 'admin123', 'admin');
