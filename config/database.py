import os
import psycopg2
from psycopg2 import pool
from psycopg2 import extras
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# PostgreSQL connection configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD'),
    'sslmode': 'require' if os.getenv('POSTGRES_SSL', 'false').lower() == 'true' else 'prefer'
}

# Connection pool settings
POOL_MIN_CONNECTIONS = 1
POOL_MAX_CONNECTIONS = int(os.getenv('POSTGRES_MAX_CONNECTIONS', '20'))

# Global connection pool
connection_pool = None

def init_connection_pool():
    """Initialize the PostgreSQL connection pool"""
    global connection_pool
    try:
        connection_pool = psycopg2.pool.ThreadedConnectionPool(
            POOL_MIN_CONNECTIONS,
            POOL_MAX_CONNECTIONS,
            **DB_CONFIG
        )
        print("✅ PostgreSQL connection pool created successfully")
        return connection_pool
    except Exception as error:
        print(f"❌ Error creating connection pool: {error}")
        raise error

def get_connection():
    """Get a connection from the pool"""
    global connection_pool
    if connection_pool is None:
        init_connection_pool()
    
    try:
        return connection_pool.getconn()
    except Exception as error:
        print(f"❌ Error getting connection from pool: {error}")
        raise error

def return_connection(connection):
    """Return a connection to the pool"""
    global connection_pool
    if connection_pool and connection:
        connection_pool.putconn(connection)

def execute_query(query, params=None):
    """Execute a query and return results"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        # Check if it's a SELECT query
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            # Get column names
            columns = [desc[0] for desc in cursor.description]
            return {
                'rows': results,
                'columns': columns
            }
        else:
            connection.commit()
            return {'affected_rows': cursor.rowcount}
            
    except Exception as error:
        if connection:
            connection.rollback()
        print(f"❌ Database query error: {error}")
        raise error
    finally:
        if cursor:
            cursor.close()
        if connection:
            return_connection(connection)

def execute_query_dict(query, params=None):
    """Execute a query and return results as list of dictionaries"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            return [dict(row) for row in results]
        else:
            connection.commit()
            return {'affected_rows': cursor.rowcount}
            
    except Exception as error:
        if connection:
            connection.rollback()
        print(f"❌ Database query error: {error}")
        raise error
    finally:
        if cursor:
            cursor.close()
        if connection:
            return_connection(connection)

def health_check():
    """Check database connection health"""
    try:
        result = execute_query("SELECT 1 as status")
        return result['rows'][0][0] == 1
    except Exception as error:
        print(f"❌ Database health check failed: {error}")
        return False

def close_all_connections():
    """Close all connections in the pool"""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        print("✅ All database connections closed")

# Initialize connection pool on import
try:
    init_connection_pool()
except Exception as e:
    print(f"❌ Failed to initialize database connection pool: {e}")

# Export main functions
__all__ = [
    'execute_query',
    'execute_query_dict', 
    'get_connection',
    'return_connection',
    'health_check',
    'close_all_connections'
] 