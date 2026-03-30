import joblib
import os

encoders_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'label_encoders.pkl')
try:
    le = joblib.load(encoders_path)
    print("Zone classes:", list(le['Zone'].classes_))
    print("Crop classes:", list(le['Crop'].classes_))
except Exception as e:
    print("Error:", e)
