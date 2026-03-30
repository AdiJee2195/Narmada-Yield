import tensorflow as tf
import numpy as np
import os

print("Forging Smart MVP MobileNetV2 with Synthetic Leaves...")

# 1. The Synthetic Leaf Generator Function
def generate_synthetic_leaf(class_type, img_size=(224, 224, 3)):
    # Create a base "leaf" (A green matrix with some random light/shadow noise)
    base_green = np.random.normal(0.4, 0.05, img_size)
    base_green[:, :, 0] = np.random.normal(0.2, 0.05, (224, 224)) # Low Red
    base_green[:, :, 1] = np.random.normal(0.6, 0.1, (224, 224))  # High Green
    base_green[:, :, 2] = np.random.normal(0.1, 0.05, (224, 224)) # Low Blue
    
    img = base_green

    if class_type == 0: 
        # Healthy: Just the green leaf
        pass
        
    elif class_type == 1: 
        # Soybean Rust: Add dark brown/grey fungal spots
        for _ in range(np.random.randint(15, 30)):
            x, y = np.random.randint(0, 214, 2)
            # Inject dark brown pixels
            img[x:x+10, y:y+10] = [0.3, 0.2, 0.1] 
            
    elif class_type == 2: 
        # Wheat Leaf Rust: Add bright orange/reddish pustules
        for _ in range(np.random.randint(20, 40)):
            x, y = np.random.randint(0, 216, 2)
            # Inject orange/red pixels
            img[x:x+8, y:y+8] = [0.8, 0.4, 0.1]
            
    return np.clip(img, 0, 1) # Ensure valid image array bounds

# 2. Generate the Dataset in RAM (50 images per class)
X_data = []
y_data = []

print("Generating synthetic training data...")
for _ in range(50):
    X_data.append(generate_synthetic_leaf(0))
    y_data.append(0)
    X_data.append(generate_synthetic_leaf(1))
    y_data.append(1)
    X_data.append(generate_synthetic_leaf(2))
    y_data.append(2)

X_train = np.array(X_data).astype('float32')
y_train = np.array(y_data)

# 3. Load MobileNetV2 (Feature Extractor)
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3), 
    include_top=False, 
    weights='imagenet'
)
base_model.trainable = False # Freeze base layers for speed

# 4. Attach Custom Classification Head
model = tf.keras.Sequential([
    base_model,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.2), # Prevent overfitting on our tiny synthetic dataset
    tf.keras.layers.Dense(3, activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# 5. Train the Model (5 Epochs will take ~30 seconds on your GPU)
print("Training the CNN to recognize rust color profiles...")
model.fit(X_train, y_train, epochs=5, batch_size=8, validation_split=0.2)

# 6. Save the actual working model
model.save('cv_disease_model.h5')
print("✅ SUCCESS: 'cv_disease_model.h5' generated! Your MVP is now visually aware.")