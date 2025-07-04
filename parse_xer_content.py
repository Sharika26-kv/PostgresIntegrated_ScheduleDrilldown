#!/usr/bin/env python3
"""
XER File Parser for Primavera P6 Schedule Data
Parses XER files and inserts data into SQLite database with file metadata tracking.
"""

import sys
import os
import re
import time
from datetime import datetime
from pathlib import Path
from config.database import execute_query, execute_query_dict

def extract_project_info_from_filename(filename):
    """
    Extract project information from filename.
    Returns a dictionary with extracted information.
    """
    # Remove file extension
    base_name = Path(filename).stem
    
    # Initialize result dictionary
    project_info = {
        'project_name': None,
        'project_id': None,
        'snapshot_date': None,
        'file_category': None,
        'bl_version': None
    }
    
    # Try to extract project name (assuming it's at the beginning)
    # Pattern: ProjectName_something_else or ProjectName-something-else
    project_match = re.match(r'^([A-Za-z0-9\s]+?)[-_]', base_name)
    if project_match:
        project_info['project_name'] = project_match.group(1).strip()
    else:
        # If no separator found, use the whole filename as project name
        project_info['project_name'] = base_name
    
    # Try to extract date patterns (YYYY-MM-DD, YYYYMMDD, MM-DD-YYYY, etc.)
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        r'(\d{4}\d{2}\d{2})',    # YYYYMMDD
        r'(\d{2}-\d{2}-\d{4})',  # MM-DD-YYYY
        r'(\d{2}/\d{2}/\d{4})',  # MM/DD/YYYY
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, base_name)
        if date_match:
            try:
                date_str = date_match.group(1)
                # Try to parse different date formats
                if '-' in date_str and len(date_str) == 10:
                    if date_str[:4].isdigit():  # YYYY-MM-DD
                        project_info['snapshot_date'] = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m-%d %H:%M:%S')
                    else:  # MM-DD-YYYY
                        project_info['snapshot_date'] = datetime.strptime(date_str, '%m-%d-%Y').strftime('%Y-%m-%d %H:%M:%S')
                elif '/' in date_str:  # MM/DD/YYYY
                    project_info['snapshot_date'] = datetime.strptime(date_str, '%m/%d/%Y').strftime('%Y-%m-%d %H:%M:%S')
                elif len(date_str) == 8:  # YYYYMMDD
                    project_info['snapshot_date'] = datetime.strptime(date_str, '%Y%m%d').strftime('%Y-%m-%d %H:%M:%S')
                break
            except ValueError:
                continue
    
    # Try to extract version information (v1.0, V2.1, Rev1, etc.)
    version_patterns = [
        r'[vV](\d+\.?\d*)',      # v1.0, V2.1
        r'[rR]ev(\d+)',          # Rev1, rev2
        r'[vV]ersion(\d+\.?\d*)', # Version1.0
    ]
    
    for pattern in version_patterns:
        version_match = re.search(pattern, base_name, re.IGNORECASE)
        if version_match:
            project_info['bl_version'] = version_match.group(1)
            break
    
    # Try to determine file category based on keywords
    category_keywords = {
        'baseline': ['baseline', 'base', 'bl'],
        'current': ['current', 'curr', 'latest'],
        'update': ['update', 'upd'],
        'forecast': ['forecast', 'fc'],
        'schedule': ['schedule', 'sched'],
        'design': ['design'],
        'construction': ['construction', 'const'],
    }
    
    base_lower = base_name.lower()
    for category, keywords in category_keywords.items():
        if any(keyword in base_lower for keyword in keywords):
            project_info['file_category'] = category
            break
    
    return project_info

def sanitize_column_name(col_name, index):
    """
    Sanitize column name for database use.
    Returns a valid column name.
    """
    if not col_name or not col_name.strip():
        return f"col_{index}"
    
    # Remove leading/trailing whitespace
    col_name = col_name.strip()
    
    # Replace invalid characters with underscores
    sanitized = re.sub(r'[^\w]', '_', col_name)
    
    # Ensure it doesn't start with a number
    if sanitized and sanitized[0].isdigit():
        sanitized = f"col_{sanitized}"
    
    # If sanitization resulted in empty string, use fallback
    if not sanitized:
        sanitized = f"col_{index}"
    
    return sanitized

def parse_xer_file(file_path):
    """
    Parse XER file and return structured data with column mapping.
    Returns a dictionary with table names as keys and table data as values.
    Each table data contains 'columns', 'column_mapping', and 'records'.
    """
    print(f"[Parser] Starting to parse XER file: {file_path}")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"XER file not found: {file_path}")
    
    xer_data = {}
    current_table = None
    current_columns = []
    current_column_mapping = {}
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
            for line_num, line in enumerate(file, 1):
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Check for table definition
                if line.startswith('%T'):
                    current_table = line[2:].strip()
                    xer_data[current_table] = {
                        'columns': [],
                        'column_mapping': {},
                        'records': []
                    }
                    current_columns = []
                    current_column_mapping = {}
                    print(f"[Parser] Found table: {current_table}")
                    continue
                
                # Check for column definition
                if line.startswith('%F') and current_table:
                    raw_columns = [col.strip() for col in line[2:].split('\t')]
                    current_columns = []
                    current_column_mapping = {}
                    
                    for i, raw_col in enumerate(raw_columns):
                        sanitized_col = sanitize_column_name(raw_col, i)
                        current_columns.append(sanitized_col)
                        current_column_mapping[sanitized_col] = i  # Map to original position
                    
                    xer_data[current_table]['columns'] = current_columns
                    xer_data[current_table]['column_mapping'] = current_column_mapping
                    
                    print(f"[Parser] Columns for {current_table}: {len(current_columns)} columns")
                    print(f"[Parser] Column names: {current_columns[:10]}...")  # Show first 10 for debugging
                    continue
                
                # Check for data rows
                if line.startswith('%R') and current_table and current_columns:
                    data_values = line[2:].split('\t')
                    
                    # Create record dictionary using sanitized column names
                    record = {}
                    for col_name in current_columns:
                        original_index = current_column_mapping[col_name]
                        value = data_values[original_index] if original_index < len(data_values) else ''
                        # Clean up the value
                        value = value.strip() if value else ''
                        if value == '':
                            value = None
                        record[col_name] = value
                    
                    xer_data[current_table]['records'].append(record)
                    continue
                
                # Check for end of table
                if line.startswith('%E') and current_table:
                    record_count = len(xer_data[current_table]['records'])
                    print(f"[Parser] Completed table {current_table}: {record_count} records")
                    current_table = None
                    current_columns = []
                    current_column_mapping = {}
                    continue
    
    except Exception as e:
        print(f"[Parser] Error reading XER file at line {line_num}: {str(e)}")
        raise
    
    print(f"[Parser] Successfully parsed XER file. Found {len(xer_data)} tables.")
    return xer_data

def insert_file_metadata(db_cursor, filename, project_info):
    """
    Insert file metadata and return the file_id.
    """
    print(f"[Database] Inserting file metadata for: {filename}")
    
    # Create file_metadata table if it doesn't exist
    create_metadata_table_sql = """
        CREATE TABLE IF NOT EXISTS file_metadata (
            file_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            project_id INTEGER,
            snapshot_date TEXT,
            file_category TEXT,
            bl_version TEXT
        )
    """
    
    execute_with_retry(db_cursor, create_metadata_table_sql)
    
    # Insert file metadata
    insert_metadata_sql = """
        INSERT INTO file_metadata (file_name, project_id, snapshot_date, file_category, bl_version)
        VALUES (?, ?, ?, ?, ?)
    """
    
    execute_with_retry(db_cursor, insert_metadata_sql, (
        filename,
        project_info.get('project_id'),
        project_info.get('snapshot_date'),
        project_info.get('file_category'),
        project_info.get('bl_version')
    ))
    
    file_id = db_cursor.lastrowid
    print(f"[Database] File metadata inserted with file_id: {file_id}")
    return file_id

def create_table_if_not_exists(db_cursor, table_name, columns):
    """
    Create table if it doesn't exist based on XER data structure.
    """
    if not columns:
        print(f"[Database] Warning: No columns provided for table {table_name}")
        return
    
    # Create column definitions
    column_defs = []
    for col_name in columns:
        column_defs.append(f'"{col_name}" TEXT')
    
    # Add file_id column if not present
    if 'file_id' not in [col.lower() for col in columns]:
        column_defs.append('file_id INTEGER')
    
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(column_defs)})'
    
    try:
        execute_with_retry(db_cursor, create_sql)
        print(f"[Database] Table {table_name} created/verified with {len(column_defs)} columns")
    except Exception as e:
        print(f"[Database] Error creating table {table_name}: {str(e)}")
        print(f"[Database] SQL: {create_sql}")
        raise

def execute_with_retry(cursor, sql, params=None, max_retries=5):
    """
    Execute SQL with retry logic for database busy errors.
    """
    for attempt in range(max_retries):
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            return
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 0.5  # Exponential backoff
                print(f"[Database] Database locked, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            else:
                raise

def get_existing_columns(db_cursor, table_name):
    """
    Get list of existing columns in a table.
    Returns empty list if table doesn't exist.
    """
    try:
        execute_with_retry(db_cursor, f'PRAGMA table_info("{table_name}")')
        columns = []
        for row in db_cursor.fetchall():
            columns.append(row[1])  # Column name is at index 1
        return columns
    except Exception as e:
        print(f"[Database] Error getting columns for table {table_name}: {str(e)}")
        return []

def add_missing_columns(db_cursor, table_name, required_columns, existing_columns):
    """
    Add any missing columns to the table.
    """
    missing_columns = []
    existing_lower = [col.lower() for col in existing_columns]
    
    for col in required_columns:
        if col.lower() not in existing_lower:
            missing_columns.append(col)
    
    if missing_columns:
        print(f"[Database] Adding {len(missing_columns)} missing columns to {table_name}: {missing_columns}")
        
        for col in missing_columns:
            try:
                alter_sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col}" TEXT'
                execute_with_retry(db_cursor, alter_sql)
                print(f"[Database] Added column '{col}' to table {table_name}")
            except Exception as e:
                print(f"[Database] Error adding column '{col}' to table {table_name}: {str(e)}")
                # Continue with other columns even if one fails
                continue
    else:
        print(f"[Database] All required columns already exist in {table_name}")

def insert_table_data(db_cursor, table_name, table_data, file_id):
    """
    Insert records into a specific table with dynamic column addition.
    """
    columns = table_data['columns']
    records = table_data['records']
    
    if not records:
        print(f"[Database] No records to insert for table {table_name}")
        return
    
    if not columns:
        print(f"[Database] No columns defined for table {table_name}")
        return
    
    print(f"[Database] Inserting {len(records)} records into {table_name}")
    
    # Add file_id to columns if not present
    final_columns = columns.copy()
    if 'file_id' not in [col.lower() for col in final_columns]:
        final_columns.append('file_id')
    
    # Create table if it doesn't exist (with initial columns)
    create_table_if_not_exists(db_cursor, table_name, columns)
    
    # Get existing columns from the table
    existing_columns = get_existing_columns(db_cursor, table_name)
    print(f"[Database] Table {table_name} has {len(existing_columns)} existing columns")
    
    # Add any missing columns
    add_missing_columns(db_cursor, table_name, final_columns, existing_columns)
    
    # Get updated column list after adding missing columns
    updated_columns = get_existing_columns(db_cursor, table_name)
    print(f"[Database] Table {table_name} now has {len(updated_columns)} columns after updates")
    
    # Prepare insert statement with all required columns
    placeholders = ', '.join(['?' for _ in final_columns])
    insert_sql = f'INSERT INTO "{table_name}" ({", ".join([f'"{col}"' for col in final_columns])}) VALUES ({placeholders})'
    
    # Insert records with retry logic
    inserted_count = 0
    for record in records:
        try:
            values = []
            for col in final_columns:
                if col == 'file_id':
                    values.append(file_id)
                else:
                    values.append(record.get(col))
            
            execute_with_retry(db_cursor, insert_sql, values)
            inserted_count += 1
            
        except Exception as e:
            print(f"[Database] Error inserting record into {table_name}: {str(e)}")
            if inserted_count == 0:  # Show more details for first error
                print(f"[Database] Required columns: {final_columns}")
                print(f"[Database] Existing columns: {updated_columns}")
                print(f"[Database] SQL: {insert_sql}")
                print(f"[Database] Sample record keys: {list(record.keys())[:10]}")
            continue
    
    print(f"[Database] Successfully inserted {inserted_count} records into {table_name}")

def main():
    """
    Main function to parse XER file and insert into database.
    """
    if len(sys.argv) < 3:
        print("Usage: python parse_xer_content.py <xer_file_path> <database_path> [original_filename]")
        sys.exit(1)
    
    xer_file_path = sys.argv[1]
    database_path = sys.argv[2]
    
    print(f"[Main] Starting XER parsing process")
    print(f"[Main] XER file: {xer_file_path}")
    print(f"[Main] Database: {database_path}")
    
    try:
        # Extract project information from filename
        # Use original filename if available, otherwise use the file path
        if len(sys.argv) > 3:
            original_filename = sys.argv[3]
        else:
            original_filename = os.path.basename(xer_file_path)
        
        project_info = extract_project_info_from_filename(original_filename)
        print(f"[Main] Using filename: {original_filename}")
        print(f"[Main] Extracted project info: {project_info}")
        
        # Parse XER file
        xer_data = parse_xer_file(xer_file_path)
        
        # Connect to PostgreSQL database
        print(f"[Database] Connecting to PostgreSQL database")
        # Database connection is handled by the config module
        
        # Insert file metadata
        file_id = insert_file_metadata(original_filename, project_info)
        
        # Insert data from each table
        for table_name, table_data in xer_data.items():
            if table_data['records']:  # Only process tables with data
                try:
                    insert_table_data(table_name, table_data, file_id)
                except Exception as e:
                    print(f"[Main] Error processing table {table_name}: {str(e)}")
                    # Continue with other tables even if one fails
                    continue
        
        print(f"[Main] Successfully processed XER file. File ID: {file_id}")
        
        # Clean up temporary file
        try:
            os.unlink(xer_file_path)
            print(f"[Main] Cleaned up temporary file: {xer_file_path}")
        except Exception as e:
            print(f"[Main] Warning: Could not delete temporary file: {str(e)}")
        print("[Main] XER parsing completed successfully")
        
    except Exception as e:
        print(f"[Main] Error during XER parsing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 