"""
Narmada Yield Phase II — Flask Backend
Agricultural Decision Support System
"""

import os
import uuid
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'narmada_yield.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    """
    Expected JSON payload:
    {
        "avg_temp_celsius": 28.5,
        "avg_humidity_percent": 72.0,
        "avg_rainfall_mm": 18.4
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Invalid or missing JSON payload."}), 400

        # Basic validation
        required_fields = ['avg_temp_celsius', 'avg_humidity_percent', 'avg_rainfall_mm']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        CROP_DISEASE_RULES = {
            "Soybean": {
                "diseases": [
                    {
                        "name": "Soybean Rust",
                        "risk_factors": {"temp_min": 15, "temp_max": 28, "humidity_threshold": 80, "rainfall_required_mm": 5},
                        "treatment": "Apply Triazole or Strobilurin-based fungicides immediately."
                    },
                    {
                        "name": "Charcoal Rot",
                        "risk_factors": {"temp_min": 28, "temp_max": 35, "humidity_threshold": 50, "notes": "Triggered by dry, hot conditions rather than high moisture."},
                        "treatment": "Increase irrigation frequency; apply organic mulching."
                    }
                ]
            },
            "Wheat": {
                "diseases": [
                    {
                        "name": "Leaf Rust",
                        "risk_factors": {"temp_min": 15, "temp_max": 22, "humidity_threshold": 75, "rainfall_required_mm": 2},
                        "treatment": "Apply Propiconazole or Tebuconazole at first sign of pustules."
                    },
                    {
                        "name": "Karnal Bunt",
                        "risk_factors": {"temp_min": 18, "temp_max": 22, "humidity_threshold": 70, "notes": "Highly critical during the heading/flowering stage."},
                        "treatment": "Preventative fungicidal spray during ear emergence."
                    }
                ]
            },
            "Paddy": {
                "diseases": [
                    {
                        "name": "Bacterial Blight",
                        "risk_factors": {"temp_min": 25, "temp_max": 34, "humidity_threshold": 70, "rainfall_required_mm": 5},
                        "treatment": "Use copper-based bactericides; ensure proper field drainage."
                    }
                ]
            },
            "Cotton": {
                "diseases": [
                    {
                        "name": "Boll Rot",
                        "risk_factors": {"temp_min": 27, "temp_max": 32, "humidity_threshold": 85, "rainfall_required_mm": 5},
                        "treatment": "Improve canopy airflow; apply preventative fungicide."
                    }
                ]
            }
        }

        # Determine Regional Scope
        zone = data.get("zone", "Central India")
        REGION_CROPS = {
            "Central India": ["Soybean", "Wheat", "Paddy", "Cotton", "Gram", "Mustard"],
            "Northern India": ["Wheat", "Mustard", "Sugarcane", "Paddy"],
            "Southern India": ["Paddy", "Cotton", "Sugarcane", "Groundnut"]
        }
        regional_crops = REGION_CROPS.get(zone, ["Soybean", "Wheat"])
        active_crops = data.get("active_crops", [])
        
        crops_to_evaluate = list(set(regional_crops).union(set(active_crops) if isinstance(active_crops, list) else set()))

        temp = float(data['avg_temp_celsius'])
        humidity = float(data['avg_humidity_percent'])
        rainfall = float(data['avg_rainfall_mm'])

        base_score = 0
        
        # Humidity Factor
        if humidity > 85:
            base_score += 50
        elif 70 <= humidity <= 85:
            base_score += 25
            
        # Temperature Factor
        if 20 <= temp <= 28:
            base_score += 30
        elif (15 <= temp <= 19) or (29 <= temp <= 32):
            base_score += 15
            
        # Rainfall Factor
        if rainfall > 5:
            base_score += 20
            
        total_risk_score = base_score
        
        if total_risk_score > 75:
            severity_level = 'High'
            recommendation = 'Preventative fungicide application recommended.'
        elif total_risk_score >= 40:
            severity_level = 'Moderate'
            recommendation = 'Monitor closely.'
        else:
            severity_level = 'Low'
            recommendation = 'Optimal conditions.'

        # Cross-reference with Crop JSON logic dynamically scoped to the region and user structure
        alerts = []
        if isinstance(crops_to_evaluate, list):
            for crop in crops_to_evaluate:
                if not isinstance(crop, str): continue
                if crop in CROP_DISEASE_RULES:
                    for disease in CROP_DISEASE_RULES[crop].get("diseases", []):
                        if not isinstance(disease, dict): continue
                        
                        rules = disease.get("risk_factors", {})
                        if not isinstance(rules, dict): continue
                        
                        try:
                            t_min = float(rules.get("temp_min", -99))
                            t_max = float(rules.get("temp_max", 99))
                        except (TypeError, ValueError):
                            continue
                        
                        if not (t_min <= temp <= t_max): continue
                        
                        try:
                            h_thresh = float(rules.get("humidity_threshold", 0))
                        except (TypeError, ValueError):
                            continue
                            
                        is_charcoal = (disease.get("name") == "Charcoal Rot")
                        
                        if is_charcoal:
                            if humidity > h_thresh: continue # Charcoal Rot thrives in DRY heat
                        else:
                            if humidity < h_thresh: continue # Others thrive in HIGH humidity
                            
                        try:
                            r_req = float(rules.get("rainfall_required_mm", 0))
                        except (TypeError, ValueError):
                            continue
                            
                        if rainfall < r_req: continue
                        
                        alerts.append({
                            "crop": crop,
                            "disease": str(disease.get("name", "Unknown")),
                            "treatment": str(disease.get("treatment", ""))
                        })
        
        if alerts:
            severity_level = 'High'
            if total_risk_score < 76: total_risk_score = 85 # Elevate risk score logically

        response = {
            "risk_percentage": total_risk_score,
            "severity_level": severity_level,
            "recommendation": recommendation,
            "regional_crops": regional_crops,
            "alerts": alerts
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
