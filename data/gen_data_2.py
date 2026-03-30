import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib

print("Booting up Zone-Aware Data Generator...")

# 1. The 11 Agro-Climatic Zones of MP and their Primary Crops
mp_zones = {
    "Malwa Plateau": ["Wheat", "Soybean", "Maize", "Cotton"],
    "Bundelkhand": ["Wheat", "Gram", "Lentil", "Jowar"],
    "Chambal Valley": ["Mustard", "Wheat", "Sorghum"],
    "Vindhyan Plateau": ["Paddy", "Wheat", "Gram"],
    "Satpura Highlands": ["Paddy", "Maize", "Coarse Millets"],
    "Central Narmada Valley": ["Wheat", "Soybean", "Gram", "Sugarcane"],
    "Kymore Plateau & Satpura Hills": ["Wheat", "Paddy", "Gram", "Soybean"],
    "Jhabua Hills": ["Maize", "Black Gram", "Soybean", "Cotton"],
    "Nimar Plains": ["Cotton", "Sorghum", "Soybean", "Wheat"],
    "Northern Hill Region of Chhattisgarh": ["Paddy", "Maize", "Wheat", "Niger"],
    "Chhattisgarh Plains": ["Paddy", "Kodo-Kutki", "Flaxseed"]
}

# Crop Season Categorization (for realistic weather generation)
rabi_crops = ["Wheat", "Gram", "Lentil", "Mustard", "Flaxseed"]
# Defaulting others to Kharif/Monsoon profiles for simulation

n_samples = 5000
np.random.seed(42)

data = []

# 2. Generate the Agronomic Data
for _ in range(n_samples):
    # Pick a random zone and one of its valid crops
    zone = np.random.choice(list(mp_zones.keys()))
    crop = np.random.choice(mp_zones[zone])
    
    # Generate weather based on crop season
    if crop in rabi_crops:
        # Winter crops (Cooler, Drier)
        temp = np.random.normal(20, 5)
        humid = np.random.normal(50, 15)
        rain = np.random.exponential(5)
        
        # Disease Logic: Unseasonal warmth + humidity triggers Rust/Blight
        if temp > 25 and humid > 70:
            disease = np.random.choice([0, 1], p=[0.2, 0.8])
        else:
            disease = np.random.choice([0, 1], p=[0.9, 0.1])
            
    else:
        # Monsoon/Kharif crops (Hotter, Wetter)
        temp = np.random.normal(30, 4)
        humid = np.random.normal(80, 12)
        rain = np.random.exponential(25)
        
        # Disease Logic: Extreme humidity triggers Pests/Fungal Rot
        if humid > 85:
            disease = np.random.choice([0, 1], p=[0.15, 0.85])
        else:
            disease = np.random.choice([0, 1], p=[0.8, 0.2])
            
    data.append([zone, crop, round(temp, 1), round(humid, 1), round(rain, 1), disease])

# 3. Build DataFrame
df = pd.DataFrame(data, columns=['Zone', 'Crop', 'Temp_14d_Avg', 'Humid_14d_Avg', 'Rain_14d_Total', 'Disease_Occurred'])

# Save the dataset for your report
df.to_csv('mp_zones_disease_data.csv', index=False)
print("✅ Dataset generated: 'mp_zones_disease_data.csv'")

# 4. Prepare Data for ML (Encoding text labels)
label_encoders = {}
for column in ['Zone', 'Crop']:
    le = LabelEncoder()
    df[column] = le.fit_transform(df[column])
    label_encoders[column] = le

# Save the encoders so Flask can translate text inputs back to numbers later
joblib.dump(label_encoders, 'label_encoders.pkl')

X = df[['Zone', 'Crop', 'Temp_14d_Avg', 'Humid_14d_Avg', 'Rain_14d_Total']]
y = df['Disease_Occurred']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Train the Model
rf_model = RandomForestClassifier(n_estimators=100, max_depth=7, random_state=42)
rf_model.fit(X_train, y_train)

# Validate
y_pred = rf_model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"✅ Zone-Aware ML Model Accuracy: {accuracy * 100:.2f}%")

# 6. Serialize and Save
joblib.dump(rf_model, 'zone_disease_risk_model.pkl')
print("✅ Model saved as 'zone_disease_risk_model.pkl'. Ready for deployment!")