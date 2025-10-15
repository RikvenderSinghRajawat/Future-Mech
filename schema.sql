-- Future Mech Database Schema
-- Advanced Automotive Service Platform with PDI Reports & Job Cards

-- Create database
CREATE DATABASE IF NOT EXISTS future_mech_db;
USE future_mech_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('client', 'service', 'admin') DEFAULT 'client',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    profile_image VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US'
);

-- Services table
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INT DEFAULT 120, -- in minutes
    service_type VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Car parts table
CREATE TABLE car_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(100),
    brand VARCHAR(100),
    part_number VARCHAR(100),
    compatibility TEXT, -- JSON string for vehicle compatibility
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    registration_no VARCHAR(20) NOT NULL UNIQUE,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    vehicle_id INT,
    assigned_to INT, -- service person
    status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    scheduled_date DATETIME,
    completed_at TIMESTAMP NULL,
    remarks TEXT,
    total_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    shipping_status ENUM('pending', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    billing_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES car_parts(id) ON DELETE CASCADE
);

-- Discounts table
CREATE TABLE discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    booking_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('stripe', 'paypal', 'upi', 'phonepe', 'google_pay', 'apple_pay', 'bank_transfer', 'wallet', 'cod', 'crypto') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(255),
    gateway_response TEXT, -- JSON response from payment gateway
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Contact submissions table
CREATE TABLE contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reports table (PDI Reports & Job Cards)
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    report_type ENUM('pdi', 'job_card', 'inspection') DEFAULT 'pdi',
    pdf_path VARCHAR(500) NOT NULL,
    generated_by INT NOT NULL,
    status ENUM('generated', 'sent', 'downloaded') DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Inspection reports table
CREATE TABLE inspection_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    overall_condition ENUM('excellent', 'good', 'fair', 'poor') NOT NULL,
    issues TEXT,
    recommendations TEXT,
    health_score INT DEFAULT 85, -- 0-100
    next_service VARCHAR(255),
    inspector_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Booking parts table (parts used in service)
CREATE TABLE booking_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES car_parts(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_car_parts_category ON car_parts(category);
CREATE INDEX idx_car_parts_is_active ON car_parts(is_active);
CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_services_is_featured ON services(is_featured);
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Insert default services
INSERT INTO services (name, description, price, duration, service_type, is_featured) VALUES
('PDI Inspection', 'Comprehensive Pre-Depth Inspection covering all vehicle systems with detailed reporting and recommendations.', 150.00, 180, 'Inspection', TRUE),
('SCI Insurance', 'Second-Hand Insurance evaluation for used vehicles with comprehensive coverage assessment.', 100.00, 120, 'Insurance', TRUE),
('BSI Suspension', 'Basic Suspension Inspection with advanced diagnostics and performance optimization.', 80.00, 90, 'Suspension', TRUE),
('Premium Detailing', 'Complete interior and exterior detailing with wax, rubbing, and deep cleaning services.', 200.00, 240, 'Detailing', TRUE),
('HPA SOS', '24/7 emergency roadside assistance including battery service and towing support.', 75.00, 60, 'Emergency', TRUE),
('Oil Change', 'Professional oil change service with high-quality motor oil and filter replacement.', 50.00, 45, 'Maintenance', FALSE),
('Brake Service', 'Complete brake inspection and service including pad replacement if needed.', 120.00, 120, 'Maintenance', FALSE),
('Tire Service', 'Tire inspection, rotation, balancing, and alignment service.', 80.00, 90, 'Maintenance', FALSE);

-- Insert sample car parts
INSERT INTO car_parts (name, description, price, stock, category, brand) VALUES
('Engine Oil Filter', 'High-quality engine oil filter for all vehicle types', 15.99, 100, 'Engine', 'Future Mech'),
('Brake Pads (Front)', 'Premium brake pads for front wheels', 45.99, 50, 'Brakes', 'Future Mech'),
('Air Filter', 'Engine air filter for improved performance', 12.99, 75, 'Engine', 'Future Mech'),
('Spark Plugs (Set of 4)', 'High-performance spark plugs', 25.99, 60, 'Engine', 'Future Mech'),
('Windshield Wipers', 'All-weather windshield wiper blades', 18.99, 40, 'Exterior', 'Future Mech'),
('Headlight Bulbs (Pair)', 'Bright LED headlight bulbs', 35.99, 30, 'Lighting', 'Future Mech'),
('Battery', '12V car battery with 3-year warranty', 89.99, 25, 'Electrical', 'Future Mech'),
('Tire (All-Season)', 'High-quality all-season tire', 120.99, 20, 'Tires', 'Future Mech');

-- Insert default settings
INSERT INTO settings (key_name, value, description) VALUES
('site_name', 'Future Mech', 'Website name'),
('site_description', 'Drive the Future with Precision and Power', 'Website tagline'),
('contact_email', 'info@futuremech.com', 'Main contact email'),
('contact_phone', '+1 (555) 123-4567', 'Main contact phone'),
('contact_address', '123 Auto Street, Car City, CC 12345', 'Business address'),
('business_hours', 'Mon-Sat: 8:00 AM - 6:00 PM', 'Business operating hours'),
('emergency_available', 'true', '24/7 emergency service availability'),
('currency', 'USD', 'Default currency'),
('timezone', 'America/New_York', 'Default timezone'),
('email_notifications', 'true', 'Enable email notifications'),
('sms_notifications', 'false', 'Enable SMS notifications');