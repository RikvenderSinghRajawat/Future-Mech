import mysql.connector
from config import Config
import os

def reset_database():
    """Reset the database completely"""
    try:
        # Connect without specifying database
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            port=Config.MYSQL_PORT
        )
        cursor = conn.cursor()
        
        # Drop and recreate database
        cursor.execute("DROP DATABASE IF EXISTS future_mech_db")
        cursor.execute("CREATE DATABASE future_mech_db")
        cursor.execute("USE future_mech_db")
        
        # Read and execute schema
        with open('schema.sql', 'r') as f:
            schema_sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = schema_sql.split(';')
        for statement in statements:
            if statement.strip():
                cursor.execute(statement)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("Database reset successfully!")
        
    except Exception as e:
        print(f"Error resetting database: {str(e)}")

if __name__ == '__main__':
    reset_database()