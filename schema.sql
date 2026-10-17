-- =====================================================================
-- MotoCraft 2-Wheeler Motors & Workshop Management System
-- Database Schema for MySQL 8.0+
-- Compatible with phpMyAdmin, MySQL Workbench, AWS RDS, Cloud SQL
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `motocraft_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `motocraft_db`;

-- 1. Users Table (Customer & Admin Accounts)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `phone` VARCHAR(25) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'customer') DEFAULT 'customer',
    `bike_model` VARCHAR(100) DEFAULT NULL,
    `bike_reg_number` VARCHAR(30) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Pre-Owned 2-Wheeler Bikes Inventory Table
CREATE TABLE IF NOT EXISTS `bikes_inventory` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `make` VARCHAR(60) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `year` INT NOT NULL,
    `reg_number` VARCHAR(30) NOT NULL UNIQUE,
    `engine_cc` INT NOT NULL DEFAULT 150,
    `kms_driven` INT NOT NULL DEFAULT 0,
    `fuel_type` VARCHAR(20) DEFAULT 'Petrol',
    `category` VARCHAR(40) DEFAULT 'Commuter',
    `owners_count` INT DEFAULT 1,
    `color` VARCHAR(50) DEFAULT 'Black',
    `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `refurb_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `stock_status` ENUM('In Showroom', 'Sold', 'Under Service') DEFAULT 'In Showroom',
    `date_added` DATE NOT NULL,
    `insurance_valid_until` DATE NOT NULL,
    `rc_status` VARCHAR(60) DEFAULT 'Verified & Clear',
    `inspection_score` INT DEFAULT 38,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Spare Parts & Consumables Inventory Table
CREATE TABLE IF NOT EXISTS `spares_inventory` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `category` VARCHAR(60) NOT NULL,
    `brand` VARCHAR(60) NOT NULL,
    `compatible_bikes` TEXT NOT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `reorder_level` INT NOT NULL DEFAULT 5,
    `purchase_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `selling_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `rack_location` VARCHAR(60) DEFAULT 'Bay A',
    `warranty_months` INT DEFAULT 12,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Sales Table (Bike Sales & Counter Spares Transactions)
CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_number` VARCHAR(40) NOT NULL UNIQUE,
    `sale_type` ENUM('BIKE', 'SPARES') NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(25) NOT NULL,
    `customer_email` VARCHAR(120) DEFAULT NULL,
    `bike_id` INT DEFAULT NULL,
    `item_details` TEXT NOT NULL,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `gross_profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_mode` VARCHAR(30) DEFAULT 'UPI',
    `sold_by` VARCHAR(60) DEFAULT 'Admin',
    `sale_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sales_bike` FOREIGN KEY (`bike_id`) REFERENCES `bikes_inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Service & Workshop Bills Table
CREATE TABLE IF NOT EXISTS `service_bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bill_number` VARCHAR(40) NOT NULL UNIQUE,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(25) NOT NULL,
    `customer_email` VARCHAR(120) DEFAULT NULL,
    `bike_reg_number` VARCHAR(30) NOT NULL,
    `bike_model` VARCHAR(100) NOT NULL,
    `current_km` INT NOT NULL DEFAULT 0,
    `service_type` VARCHAR(100) NOT NULL,
    `technician_name` VARCHAR(100) NOT NULL,
    `labor_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `parts_json` TEXT DEFAULT NULL,
    `parts_subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5,2) DEFAULT 18.00,
    `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('Paid', 'Pending') DEFAULT 'Pending',
    `payment_mode` VARCHAR(30) DEFAULT 'UPI',
    `notes` TEXT DEFAULT NULL,
    `bill_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Automated Service Alerts Log Table
CREATE TABLE IF NOT EXISTS `service_alerts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(25) NOT NULL,
    `bike_reg` VARCHAR(30) NOT NULL,
    `bike_model` VARCHAR(100) NOT NULL,
    `alert_type` ENUM('SERVICE_OVERDUE', 'INSURANCE_EXPIRING', 'STOCK_AGING') NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('Pending', 'Dispatched') DEFAULT 'Pending',
    `dispatched_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
