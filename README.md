# Narmada Yield — Virtual Agronomist

**Narmada Yield** is an advanced Agricultural Decision Support System (ADSS) designed to bridge the information gap for farmers ("Bhumiputrs" and "Annadaatas"). It serves as a "Virtual Agronomist," providing data-driven insights through machine learning, computer vision, and deterministic soil science to optimize crop health and yield.

---

## 🌟 Key Features

### 1. Risk Forecasting (Machine Learning)
Utilizes a **Random Forest Classifier** to predict biological risks based on 14-day weather patterns.
* **Input**: Geographic zone, crop type, and 14-day averages for temperature, humidity, and rainfall.
* **Output**: A probability-based risk assessment (High/Low) with preventative advice.

### 2. Diagnostic Vision (Computer Vision)
Empowers farmers to diagnose crop diseases instantly using image recognition.
* **Model**: A TensorFlow-based Deep Learning model trained to detect "Healthy" plants vs. "Soybean Rust" or "Wheat Leaf Rust".
* **Treatment Engine**: Automatically maps detected diseases to localized treatment strategies based on the agricultural zone (e.g., recommending Hexaconazole for Soybean Rust in the Malwa Plateau).

### 3. Soil Health Engine
A precise calculator for fertilizer optimization.
* **Function**: Converts Soil Health Card N-P-K (Nitrogen, Phosphorus, Potassium) values into actionable commercial fertilizer weights.
* **Output**: Specific dosages for **Urea, DAP, and MOP** in kilograms.

### 4. Smart Farmer Profiles
* **Persistence**: Uses a SQLite backend to store farmer details including phone numbers, default zones, and last recorded soil nutrient levels.
* **Sync**: A unified frontend state management system ensures that tools are always tuned to the user's specific region and crop.

---

## 🛠️ Technical Stack

### Backend
* **Framework**: Flask (Python).
* **Machine Learning**: Scikit-learn (Random Forest) and TensorFlow (CNN for Image Classification).
* **Database**: SQLite3 for lightweight, local-first profile management.
* **Data Processing**: NumPy, Pillow, and Joblib.

### Frontend
* **Core**: Modern Vanilla JavaScript (ES6+), HTML5, and CSS3.
* **UI/UX**: Responsive Single Page Application (SPA) architecture with a custom "Traffic Light" alert system for risk levels.
* **Interactivity**: Drag-and-drop image uploads for diagnostics and real-time UI synchronization.

---

## 🚀 Installation & Setup

### Prerequisites
* Python 3.8+
* Modern Web Browser

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
The server will start on `http://localhost:5005`.

### 2. Frontend Setup
Open `frontend/index.html` in any modern web browser. Ensure the `API_BASE` in `app.js` matches your backend URL.

### 3. Alternate Setup
*Directly clone the directory into your local device and run the batch file. 
* Then go to your browser and put in http://localhost:8085 to access the web-app

---

## 📂 Project Structure
* `backend/app.py`: Core API handling ML inference, DB operations, and diagnostic logic.
* `frontend/app.js`: Frontend engine managing SPA routing, UI state, and API communication.
* `data/`: Contains trained `.pkl` models, `.h5` deep learning models, and label encoders.
* `frontend/index.html`: Main entry point for the user interface.

---

## 📡 API Endpoints
* `POST /predict_risk`: Weather-based disease forecasting.
* `POST /diagnose`: Image-based disease identification.
* `POST /shc`: Fertilizer recommendation calculator.
* `POST /save_profile` / `POST /load_profile`: Farmer data management.
