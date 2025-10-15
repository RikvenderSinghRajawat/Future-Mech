#!/usr/bin/env python3
"""
Initialize Future Mech Database with Default Users
This script creates the database, tables, and inserts default users with proper password hashes
"""

import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash
import os
import sys

def create_database_and_users():
    """Create database and insert default users"""
    try:
        # Database configuration
        config = {
            'host': 'localhost',
            'user': 'root',
            'password': '12345',  # Update this to match your MySQL password
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_unicode_ci'
        }
        
        print("🔄 Connecting to MySQL server...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Create database
        print("🔄 Creating database...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS future_mech_db")
        cursor.execute("USE future_mech_db")
        print("✅ Database created/selected successfully")
        
        # Read and execute schema
        print("🔄 Creating tables...")
        with open('schema.sql', 'r', encoding='utf-8') as file:
            schema_content = file.read()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in schema_content.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement.upper().startswith(('CREATE', 'INSERT', 'USE')):
                try:
                    cursor.execute(statement)
                except Error as e:
                    if "already exists" not in str(e).lower():
                        print(f"⚠️  Warning executing statement: {e}")
        
        connection.commit()
        print("✅ Tables created successfully")
        
        # Generate proper password hashes
        print("🔄 Generating password hashes...")
        admin_hash = generate_password_hash('admin123')
        service_hash = generate_password_hash('service123')
        
        # Clear existing default users and insert new ones
        print("🔄 Inserting default users...")
        
        # Delete existing default users if they exist
        cursor.execute("DELETE FROM users WHERE email IN ('admin@futuremech.com', 'service@futuremech.com')")
        
        # Insert admin user
        cursor.execute("""
            INSERT INTO users (username, email, password, role, is_active, email_verified) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('admin', 'admin@futuremech.com', admin_hash, 'admin', True, True))
        
        # Insert service user
        cursor.execute("""
            INSERT INTO users (username, email, password, role, is_active, email_verified) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('service_tech', 'service@futuremech.com', service_hash, 'service', True, True))
        
        connection.commit()
        print("✅ Default users created successfully")
        
        # Verify users were created
        cursor.execute("SELECT username, email, role FROM users WHERE role IN ('admin', 'service')")
        users = cursor.fetchall()
        
        print("\n📋 Default Users Created:")
        print("=" * 50)
        for user in users:
            username, email, role = user
            password = 'admin123' if role == 'admin' else 'service123'
            print(f"Role: {role.upper()}")
            print(f"Email: {email}")
            print(f"Password: {password}")
            print("-" * 30)
        
        cursor.close()
        connection.close()
        
        print("\n🎉 Database initialization completed successfully!")
        print("\nNext steps:")
        print("1. Run: python app.py")
        print("2. Open: http://localhost:5000")
        print("3. Login with the credentials shown above")
        
        return True
        
    except Error as e:
        print(f"❌ Database error: {e}")
        return False
    except FileNotFoundError:
        print("❌ schema.sql file not found. Please ensure it exists in the current directory.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main function"""
    print("🚗 Future Mech Database Initialization")
    print("=" * 50)
    
    # Check if schema.sql exists
    if not os.path.exists('schema.sql'):
        print("❌ schema.sql file not found!")
        print("Please ensure schema.sql is in the current directory.")
        sys.exit(1)
    
    # Initialize database
    if create_database_and_users():
        print("\n✅ Initialization completed successfully!")
    else:
        print("\n❌ Initialization failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
