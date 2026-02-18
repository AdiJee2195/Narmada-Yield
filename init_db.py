import sqlite3

def init_db():
    try:
        conn = sqlite3.connect('agri.db')
        cursor = conn.cursor()
        
        # Create table for farmers
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS farmers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL,
                location TEXT DEFAULT 'Sehore'
            )
        ''')
        
        print("✅ Success: Database 'agri.db' and table 'farmers' created.")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ Error creating database: {e}")

if __name__ == '__main__':
    init_db()