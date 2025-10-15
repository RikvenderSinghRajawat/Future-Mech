from werkzeug.security import generate_password_hash

# Generate hashed passwords
admin_password = generate_password_hash('admin123')  # Change 'admin123' to your desired password
service_password = generate_password_hash('service123')  # Change 'service123' to your desired password

print("Admin password hash:", admin_password)
print("Service password hash:", service_password)