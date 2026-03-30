// frontend/agroConfig.js
const agroZones = {
    "Chhattisgarh Plains": ["Paddy", "Wheat"],
    "Northern Hill Region of Chhattisgarh": ["Paddy", "Maize"],
    "Kymore Plateau & Satpura Hills": ["Wheat", "Paddy", "Gram"],
    "Central Narmada Valley": ["Wheat", "Soybean", "Gram"],
    "Vindhyan Plateau": ["Wheat", "Soybean", "Gram"],
    "Chambal Valley": ["Wheat", "Mustard", "Coarse Millets"],
    "Bundelkhand": ["Wheat", "Sorghum", "Gram"],
    "Satpura Highlands": ["Wheat", "Sorghum", "Cotton"],
    "Malwa Plateau": ["Soybean", "Wheat", "Cotton"],
    "Nimar Plains": ["Cotton", "Sorghum", "Wheat"],
    "Jhabua Hills": ["Maize", "Black Gram", "Cotton"]
};

// Use the exact trained array so the UI chip-selector natively offers everything the ML can predict
const allAvailableCrops = [
    "Black Gram", "Coarse Millets", "Cotton", "Flaxseed", "Gram", 
    "Jowar", "Kodo-Kutki", "Lentil", "Maize", "Mustard", 
    "Niger", "Paddy", "Sorghum", "Soybean", "Sugarcane", "Wheat"
].sort();

// Make available globally for vanilla JS access
window.agroZones = agroZones;
window.allAvailableCrops = allAvailableCrops;
