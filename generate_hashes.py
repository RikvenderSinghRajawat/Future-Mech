#!/usr/bin/env python3
"""
Generate proper password hashes for default users
"""

from werkzeug.security import generate_password_hash

# Generate hashed passwords
admin_password = generate_password_hash('admin123')
service_password = generate_password_hash('service123')

print("=== Password Hashes for Default Users ===")
print(f"Admin password hash: {admin_password}")
print(f"Service password hash: {service_password}")
print("\n=== SQL Update Statements ===")
print(f"-- Admin user (email: admin@futuremech.com, password: admin123)")
print(f"INSERT INTO users (username, email, password, role, is_active, email_verified) VALUES")
print(f"('admin', 'admin@futuremech.com', '{admin_password}', 'admin', TRUE, TRUE);")
print()
print(f"-- Service user (email: service@futuremech.com, password: service123)")
print(f"INSERT INTO users (username, email, password, role, is_active, email_verified) VALUES")
print(f"('service_tech', 'service@futuremech.com', '{service_password}', 'service', TRUE, TRUE);")
