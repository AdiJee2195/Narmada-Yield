// frontend/agroConfig.js
const agroZones = {
    "Chhattisgarh Plains": ["Rice", "Wheat"],
    "Northern Hill Region of Chhattisgarh": ["Rice", "Maize"],
    "Kymore Plateau and Satpura Hill": ["Wheat", "Rice", "Gram"],
    "Central Narmada Valley": ["Wheat", "Soybean", "Gram"],
    "Vindhya Plateau": ["Wheat", "Soybean", "Gram"],
    "Gird Region": ["Wheat", "Mustard", "Pearl Millet"],
    "Bundelkhand Region": ["Wheat", "Sorghum", "Gram"],
    "Satpura Plateau": ["Wheat", "Sorghum", "Cotton"],
    "Malwa Plateau": ["Soybean", "Wheat", "Cotton"],
    "Nimar Valley": ["Cotton", "Sorghum", "Wheat"],
    "Jhabua Hills": ["Maize", "Black Gram", "Cotton"]
};

// Generate a flattened array of all unique crops mathematically
const allAvailableCrops = Array.from(new Set(Object.values(agroZones).flat())).sort();

// Make available globally for vanilla JS access
window.agroZones = agroZones;
window.allAvailableCrops = allAvailableCrops;
