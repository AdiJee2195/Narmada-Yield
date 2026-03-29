"""
init_db.py — Database Initialisation Script
Narmada Yield Phase II

Run once to create and seed the SQLite database:
    python init_db.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'narmada_yield.db')


AGRO_CLIMATIC_ZONES_DATA = [
    # (zone_id, zone_name, state, avg_annual_rainfall_mm, dominant_soil_type,
    #  primary_crops, avg_temp_summer_c, avg_temp_winter_c, kharif_season, rabi_season)
    (1, 'Chhattisgarh Plains', 'Madhya Pradesh', 1400, 'Red and Yellow', 'Paddy', 39.0, 13.0, 'June - October', 'November - March'),
    (2, 'Northern Hill Region of Chhattisgarh', 'Madhya Pradesh', 1300, 'Red and Yellow', 'Paddy, Maize', 38.0, 10.0, 'June - October', 'October - March'),
    (3, 'Kymore Plateau and Satpura Hills', 'Madhya Pradesh', 1100, 'Mixed Red & Black', 'Wheat, Gram, Soybean', 41.0, 11.0, 'June - October', 'November - March'),
    (4, 'Vindhyan Plateau', 'Madhya Pradesh', 1100, 'Medium Black', 'Wheat, Soybean, Gram', 40.0, 10.0, 'June - October', 'October - March'),
    (5, 'Central Narmada Valley', 'Madhya Pradesh', 1300, 'Deep Black', 'Wheat, Soybean', 40.0, 12.0, 'June - October', 'November - March'),
    (6, 'Gird Region', 'Madhya Pradesh', 700, 'Alluvial', 'Mustard, Wheat', 42.0, 8.0, 'July - September', 'October - March'),
    (7, 'Bundelkhand', 'Madhya Pradesh', 850, 'Red and Yellow Laterite Soil', 'Wheat, Gram', 42.1, 10.8, 'June - October', 'November - March'),
    (8, 'Satpura Plateau', 'Madhya Pradesh', 1050, 'Shallow Black', 'Sorghum, Cotton', 39.0, 11.0, 'June - October', 'November - March'),
    (9, 'Malwa Plateau', 'Madhya Pradesh', 900, 'Black Cotton Soil (Vertisol)', 'Wheat, Soybean, Cotton', 39.0, 11.0, 'June - October', 'November - March'),
    (10, 'Nimar Valley', 'Madhya Pradesh', 800, 'Medium Black', 'Cotton, Wheat', 41.0, 13.0, 'June - October', 'November - March'),
    (11, 'Jhabua Hills', 'Madhya Pradesh', 800, 'Medium Black', 'Cotton, Maize', 39.0, 12.0, 'June - October', 'November - March'),
]


def create_tables(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Agro_Climatic_Zones (
            zone_id                 INTEGER PRIMARY KEY,
            zone_name               TEXT    NOT NULL UNIQUE,
            state                   TEXT    NOT NULL,
            avg_annual_rainfall_mm  REAL,
            dominant_soil_type      TEXT,
            primary_crops           TEXT,
            avg_temp_summer_c       REAL,
            avg_temp_winter_c       REAL,
            kharif_season           TEXT,
            rabi_season             TEXT,
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Farmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("[OK] Table 'Farmers' created (or already exists).")

    conn.commit()
    print("[OK] Table 'Agro_Climatic_Zones' created (or already exists).")


def seed_data(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()

    insert_sql = '''
        INSERT OR IGNORE INTO Agro_Climatic_Zones
            (zone_id, zone_name, state, avg_annual_rainfall_mm, dominant_soil_type,
             primary_crops, avg_temp_summer_c, avg_temp_winter_c, kharif_season, rabi_season)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    '''

    cursor.executemany(insert_sql, AGRO_CLIMATIC_ZONES_DATA)
    conn.commit()

    inserted = cursor.rowcount
    print(f"[OK] Seeded {len(AGRO_CLIMATIC_ZONES_DATA)} rows into 'Agro_Climatic_Zones' "
          f"({inserted} new rows inserted).")


def verify_data(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.execute('SELECT zone_id, zone_name, state, primary_crops FROM Agro_Climatic_Zones')
    rows = cursor.fetchall()

    print("\n--- Agro_Climatic_Zones table contents ---")
    print(f"{'ID':<5} {'Zone Name':<22} {'State':<35} {'Primary Crops'}")
    print("-" * 90)
    for row in rows:
        print(f"{row[0]:<5} {row[1]:<22} {row[2]:<35} {row[3]}")
    print(f"\nTotal zones: {len(rows)}")


def init_db() -> None:
    print(f"[*] Initialising database at: {DB_PATH}\n")
    conn = sqlite3.connect(DB_PATH)
    try:
        create_tables(conn)
        seed_data(conn)
        verify_data(conn)
        print("\n[OK] Database initialisation complete.")
    finally:
        conn.close()


if __name__ == '__main__':
    init_db()
