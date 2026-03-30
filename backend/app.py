"""
Narmada Yield Phase II — Flask Backend
Agricultural Decision Support System
"""

import os
import uuid
import sqlite3
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load Machine Learning Model parameters
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'zone_disease_risk_model.pkl')
ENCODERS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'label_encoders.pkl')

rf_model = None
label_encoders = {}

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODERS_PATH):
        rf_model = joblib.load(MODEL_PATH)
        label_encoders = joblib.load(ENCODERS_PATH)
        app.logger.info("Successfully loaded Random Forest model and encoders.")
    else:
        app.logger.warning("ML Model files not found. Predict route may fail.")
except Exception as e:
    app.logger.error(f"Error loading ML models: {e}")

DB_PATH = os.path.join(os.path.dirname(__file__), 'narmada_yield.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Farmers (
            phone TEXT PRIMARY KEY
        )
    ''')
    
    columns_to_add = {
        'name': 'TEXT',
        'default_zone': 'TEXT',
        'default_crop': 'TEXT',
        'last_n': 'REAL',
        'last_p': 'REAL',
        'last_k': 'REAL'
    }
    
    cursor.execute("PRAGMA table_info(Farmers)")
    existing_columns = [col['name'] for col in cursor.fetchall()]
    
    for col_name, col_type in columns_to_add.items():
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE Farmers ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                app.logger.error(f"Failed to add column {col_name}: {e}")
                
    conn.commit()
    conn.close()

with app.app_context():
    init_db()

def generate_advice(temp, humidity, crop=""):
    """Deterministic logic engine"""
    constraints = {
        "Wheat": {"max_temp": 35, "stress_msg": "Wheat Heat Stress > 35°C"},
        "Soybean": {"max_humidity": 80, "pest_msg": "Soybean Pest Risk > 80% humidity"}
    }
    alerts = []
    if crop == "Wheat" and temp is not None and temp > constraints["Wheat"]["max_temp"]:
        alerts.append(constraints["Wheat"]["stress_msg"])
    if crop == "Soybean" and humidity is not None and humidity > constraints["Soybean"]["max_humidity"]:
        alerts.append(constraints["Soybean"]["pest_msg"])
    return alerts

# ---------------------------------------------------------------------------
# Route: POST /register
# ---------------------------------------------------------------------------
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True, silent=True)
        if not data or 'phone' not in data:
            return jsonify({"error": "Missing phone number"}), 400
        
        phone = str(data['phone']).strip()
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO Farmers (phone) VALUES (?)', (phone,))
            conn.commit()
            return jsonify({"message": "Successfully registered for SMS alerts", "phone": phone}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "Phone number already registered"}), 409
        finally:
            conn.close()
    except Exception as e:
        app.logger.error(f"/register error: {e}")
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500

# ---------------------------------------------------------------------------
# Route: POST /load_profile
# ---------------------------------------------------------------------------
@app.route('/load_profile', methods=['POST'])
def load_profile():
    data = request.get_json(force=True, silent=True)
    if not data or 'phone' not in data:
        return jsonify({"error": "Missing phone number"}), 400
        
    phone = str(data['phone']).strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Farmers WHERE phone = ?", (phone,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return jsonify(dict(row)), 200
    else:
        return jsonify({"error": "Profile not found"}), 404

# ---------------------------------------------------------------------------
# Route: POST /save_profile
# ---------------------------------------------------------------------------
@app.route('/save_profile', methods=['POST'])
def save_profile():
    data = request.get_json(force=True, silent=True)
    if not data or 'phone' not in data:
        return jsonify({"error": "Missing phone number"}), 400
        
    phone = str(data['phone']).strip()
    name = data.get('name', '')
    default_zone = data.get('default_zone', '')
    default_crop = data.get('default_crop', '')
    
    try: last_n = float(data.get('last_n')) if data.get('last_n') is not None else None
    except ValueError: last_n = None
    try: last_p = float(data.get('last_p')) if data.get('last_p') is not None else None
    except ValueError: last_p = None
    try: last_k = float(data.get('last_k')) if data.get('last_k') is not None else None
    except ValueError: last_k = None
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT phone FROM Farmers WHERE phone = ?", (phone,))
        if cursor.fetchone():
            cursor.execute("""
                UPDATE Farmers 
                SET name=?, default_zone=?, default_crop=?, last_n=?, last_p=?, last_k=?
                WHERE phone=?
            """, (name, default_zone, default_crop, last_n, last_p, last_k, phone))
        else:
            cursor.execute("""
                INSERT INTO Farmers (phone, name, default_zone, default_crop, last_n, last_p, last_k)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (phone, name, default_zone, default_crop, last_n, last_p, last_k))
        conn.commit()
        return jsonify({"message": "Profile saved successfully."}), 200
    except Exception as e:
        app.logger.error(f"/save_profile error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Directory to temporarily store uploaded images
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# Route: POST /predict_risk
# Accepts 14-day weather averages and returns a disease risk prediction.
# ---------------------------------------------------------------------------
@app.route('/predict_risk', methods=['POST'])
def predict_risk():
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Invalid or missing JSON payload."}), 400

        required_fields = ['zone', 'crop', 'temp_14d', 'humid_14d', 'rain_14d']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        if rf_model is None or not label_encoders:
            return jsonify({"error": "ML model not initialized. Check ML pickle files."}), 503

        zone_str = str(data['zone']).strip()
        crop_str = str(data['crop']).strip()
        
        try:
            zone_encoder = label_encoders.get('Zone')
            crop_encoder = label_encoders.get('Crop')
            if not zone_encoder or not crop_encoder:
                raise ValueError("Encoders missing from memory.")
                
            zone_encoded = zone_encoder.transform([zone_str])[0]
            crop_encoded = crop_encoder.transform([crop_str])[0]
        except Exception as e:
             return jsonify({"error": f"Encoding error for inputs (Zone: {zone_str}, Crop: {crop_str}): {str(e)}"}), 400

        temp = float(data['temp_14d'])
        humid = float(data['humid_14d'])
        rain = float(data['rain_14d'])
        
        # Assumed feature order for sklearn rf
        features = np.array([[zone_encoded, crop_encoded, temp, humid, rain]])
        
        prediction = rf_model.predict(features)[0]
        probabilities = rf_model.predict_proba(features)[0]
        
        prob_pct = round(max(probabilities) * 100, 2)
        
        if prediction == 1:
            response = {
                "status": "success",
                "alert_level": "danger",
                "probability": prob_pct,
                "message": f"High Biological Risk for {crop_str} in {zone_str}. Preventative application necessary."
            }
        else:
            response = {
                "status": "success",
                "alert_level": "success",
                "probability": prob_pct,
                "message": "Low Risk. Weather stable."
            }
            
        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"/predict_risk error: {e}")
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500


# ---------------------------------------------------------------------------
# Route: POST /diagnose
# Accepts an image file upload and returns a disease diagnosis.
# ---------------------------------------------------------------------------
@app.route('/diagnose', methods=['POST'])
def diagnose():
    """
    Expected multipart/form-data:
        file: <image file>
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request. Use key 'file'."}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 415

        # Save temporarily with a unique name to avoid collisions
        ext = file.filename.rsplit('.', 1)[1].lower()
        temp_filename = f"{uuid.uuid4().hex}.{ext}"
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
        file.save(temp_path)

        # --- Dummy diagnosis logic ---
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT zone_name FROM Agro_Climatic_Zones WHERE zone_name = 'Malwa Plateau' LIMIT 1")
        row = cursor.fetchone()
        zone_name = row['zone_name'] if row else "Unknown Zone"
        conn.close()

        response = {
            "detected": "Wheat Leaf Rust", 
            "treatment": f"Apply Propiconazole (Zone: {zone_name})"
        }

        # Optionally clean up temp file after responding (keep for now for debugging)
        # os.remove(temp_path)

        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"/diagnose error: {e}")
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500


# ---------------------------------------------------------------------------
# Route: POST /shc
# Accepts N, P, K values and returns Soil Health Card fertiliser recommendations.
# ---------------------------------------------------------------------------
@app.route('/shc', methods=['POST'])
def shc():
    """
    Expected JSON payload:
    {
        "N": 120,
        "P": 30,
        "K": 60
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Invalid or missing JSON payload."}), 400

        required_fields = ['N', 'P', 'K']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        # Type validation
        for field in required_fields:
            if not isinstance(data[field], (int, float)):
                return jsonify({"error": f"Field '{field}' must be a numeric value."}), 400

        req_N = float(data["N"])
        req_P = float(data["P"])
        req_K = float(data["K"])

        dap = req_P / 0.46
        n_from_dap = dap * 0.18
        remaining_n = req_N - n_from_dap
        if remaining_n < 0:
            remaining_n = 0

        urea = remaining_n / 0.46
        mop = req_K / 0.60

        response = {
            "urea_kg": float(f"{urea:.2f}"),
            "dap_kg": float(f"{dap:.2f}"),
            "mop_kg": float(f"{mop:.2f}")
        }
        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"/shc error: {e}")
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500


# ---------------------------------------------------------------------------
# Health-check endpoint
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Narmada Yield Phase II API"}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005)
