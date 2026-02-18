from flask import Flask, render_template, request, redirect, url_for
import json
import os
import sqlite3

app = Flask(__name__)

# --- 1. MOCK WEATHER FUNCTION ---
def get_weather():
    # TIP: Change these numbers later to test your alerts!
    return {
        "temp": 36.5,            # High temp to trigger heat warning
        "humidity": 85,          # High humidity to trigger pest warning
        "condition": "Sunny",
        "city": "Sehore (Simulated)"
    }

# --- 2. STATIC DATA LOADER ---
def load_static_data():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        soil_path = os.path.join(base_dir, 'data', 'soil_data.json')
        crop_path = os.path.join(base_dir, 'data', 'crop_data.json')
        
        with open(soil_path, 'r') as f:
            soil = json.load(f)
        with open(crop_path, 'r') as f:
            crops = json.load(f)
        return soil, crops
    except Exception as e:
        print(f"Error loading files: {e}")
        return {}, {}

# --- 3. THE RULE ENGINE (NEW!) ---
def generate_advice(weather, crops):
    advice_list = []
    
    temp = weather['temp']
    humidity = weather['humidity']
    
    # Rule 1: General Irrigation Rule
    if temp > 35:
        advice_list.append({
            "type": "danger", 
            "msg": f"🔥 HEAT ALERT: Temperature is {temp}°C. Evaporation is high. Apply irrigation immediately for all crops."
        })

    # Rule 2: Crop-Specific Rules
    for crop, details in crops.items():
        # Check Pest Risk
        if "High Humidity" in details['risk_condition'] and humidity > 80:
            advice_list.append({
                "type": "warning",
                "msg": f"🐛 {crop.capitalize()} Risk: High humidity ({humidity}%) detected. Watch out for {details['common_pests'][0]}."
            })
            
    if not advice_list:
        advice_list.append({"type": "success", "msg": "✅ Conditions are optimal. Standard monitoring only."})
        
    return advice_list

# --- 4. ROUTES ---
@app.route('/')
def home():
    weather = get_weather()
    soil, crops = load_static_data()
    
    # Generate Smart Advice based on the data
    recommendations = generate_advice(weather, crops)
    
    return render_template('index.html', weather=weather, soil=soil, crops=crops, recommendations=recommendations)

# --- 5. SMS PLACEHOLDER FUNCTION ---
# Add this function above your routes
def send_sms_alert(phone_number, message):
    """
    Placeholder: In Phase 3, we will add Twilio code here.
    For now, it simulates sending by printing to the server console.
    """
    print(f"------------------------------------------------")
    print(f"🚀 [SIMULATING SMS] To: {phone_number}")
    print(f"📩 Message: {message}")
    print(f"------------------------------------------------")

# --- UPDATE THE ROUTE ---
@app.route('/register', methods=['POST'])
def register():
    phone = request.form.get('phone_number')
    
    if phone:
        try:
            conn = sqlite3.connect('agri.db')
            cursor = conn.cursor()
            cursor.execute("INSERT INTO farmers (phone_number) VALUES (?)", (phone,))
            conn.commit()
            conn.close()
            
            # Call the placeholder function
            send_sms_alert(phone, "Welcome to Sehore Agri-Assistant! You are now registered.")
            
        except Exception as e:
            print(f"Database Error: {e}")
            
    return redirect(url_for('home'))



if __name__ == '__main__':
    app.run(debug=True)