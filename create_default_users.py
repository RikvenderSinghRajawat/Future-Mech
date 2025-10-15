#!/usr/bin/env python3
"""
Script to create default users for Future Mech application
This script generates proper password hashes and inserts default users into the database.
"""

import MySQLdb
from werkzeug.security import generate_password_hash
import sys

# Database configuration
DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = '12345'  # Change this to your MySQL password
DB_NAME = 'future_mech_db'

def create_default_users():
    """Create default admin and service users with proper password hashes."""
    
    try:
        # Connect to database
        print("Connecting to database...")
        db = MySQLdb.connect(
            host=DB_HOST,
            user=DB_USER,
            passwd=DB_PASSWORD,
            db=DB_NAME
        )
        cursor = db.cursor()
        print("Database connection successful!")
        
        # Generate password hashes
        admin_password_hash = generate_password_hash('admin123')
        service_password_hash = generate_password_hash('service123')
        
        print("Generated password hashes:")
        print(f"Admin password hash: {admin_password_hash}")
        print(f"Service password hash: {service_password_hash}")
        
        # Delete existing users if they exist
        cursor.execute("DELETE FROM users WHERE email IN ('admin@futuremech.com', 'service@futuremech.com')")
        print("Cleared existing default users...")
        
        # Insert admin user
        admin_query = """
        INSERT INTO users (username, email, password, role, is_active, email_verified) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        admin_data = ('admin', 'admin@futuremech.com', admin_password_hash, 'admin', True, True)
        cursor.execute(admin_query, admin_data)
        
        # Insert service user
        service_query = """
        INSERT INTO users (username, email, password, role, is_active, email_verified) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        service_data = ('service_tech', 'service@futuremech.com', service_password_hash, 'service', True, True)
        cursor.execute(service_query, service_data)
        
        # Insert sample client user
        client_password_hash = generate_password_hash('client123')
        client_query = """
        INSERT INTO users (username, email, password, phone, role, is_active, email_verified) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        client_data = ('john_doe', 'client@example.com', client_password_hash, '+1234567890', 'client', True, True)
        cursor.execute(client_query, client_data)
        
        # Commit changes
        db.commit()
        print("\nDefault users created successfully!")
        print("\nLogin credentials:")
        print("="*50)
        print("ADMIN USER:")
        print("  Email: admin@futuremech.com")
        print("  Password: admin123")
        print("\nSERVICE USER:")
        print("  Email: service@futuremech.com")
        print("  Password: service123")
        print("\nCLIENT USER (for testing):")
        print("  Email: client@example.com")
        print("  Password: client123")
        print("="*50)
        
        # Verify users were created
        cursor.execute("SELECT id, username, email, role FROM users WHERE role IN ('admin', 'service')")
        users = cursor.fetchall()
        print(f"\nVerification: {len(users)} default users found in database:")
        for user in users:
            print(f"  ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Role: {user[3]}")
        
        cursor.close()
        db.close()
        print("\nDatabase connection closed.")
        
    except MySQLdb.Error as e:
        print(f"MySQL Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def verify_database_setup():
    """Verify that the database and tables exist."""
    try:
        print("Verifying database setup...")
        db = MySQLdb.connect(
            host=DB_HOST,
            user=DB_USER,
            passwd=DB_PASSWORD,
            db=DB_NAME
        )
        cursor = db.cursor()
        
        # Check if users table exists
        cursor.execute("SHOW TABLES LIKE 'users'")
        if not cursor.fetchone():
            print("ERROR: 'users' table not found. Please run the schema.sql file first.")
            return False
            
        # Check if services table exists and has data
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]
        print(f"Found {service_count} services in database")
        
        # Check if car_parts table exists and has data
        cursor.execute("SELECT COUNT(*) FROM car_parts")
        parts_count = cursor.fetchone()[0]
        print(f"Found {parts_count} car parts in database")
        
        cursor.close()
        db.close()
        return True
        
    except MySQLdb.Error as e:
        print(f"Database verification failed: {e}")
        return False

if __name__ == "__main__":
    print("Future Mech - Default Users Creation Script")
    print("="*50)
    
    # Verify database setup first
    if not verify_database_setup():
        print("\nPlease ensure:")
        print("1. MySQL server is running")
        print("2. Database 'future_mech_db' exists")
        print("3. All tables are created (run schema.sql)")
        print("4. Database credentials are correct in this script")
        sys.exit(1)
    
    # Create default users
    create_default_users()