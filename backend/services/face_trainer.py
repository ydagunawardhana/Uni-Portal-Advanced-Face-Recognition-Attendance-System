import os
import pickle
import face_recognition # type: ignore
import cv2 # type: ignore
from pathlib import Path
import numpy as np # type: ignore

BASE_DIR = Path(__file__).resolve().parent.parent
ENCODINGS_PATH = str(BASE_DIR / "encodings.pkl")
DATASET_BASE_DIR = BASE_DIR

def update_face_model(index_number: str, dataset_path: str):
    """
    Incrementally updates the Deep Learning face encodings with new student faces.
    Runs asynchronously in the background.
    """
    known_encodings = []
    known_names = []
    
    if os.path.exists(ENCODINGS_PATH):
        try:
            with open(ENCODINGS_PATH, "rb") as f:
                data = pickle.load(f)
                known_encodings = data["encodings"]
                known_names = data["names"]
        except Exception as e:
            print(f"[FaceTrainer] Warning: Failed to load existing model: {e}")
            
    folder_path = DATASET_BASE_DIR / dataset_path
    if not folder_path.exists():
        print(f"[FaceTrainer] Dataset path {folder_path} does not exist.")
        return
        
    count = 0
    for file in os.listdir(folder_path):
        if file.lower().endswith(('.png', '.jpg', '.jpeg')):
            img_path = str(folder_path / file)
            try:
                img = cv2.imread(img_path)
                if img is None: continue
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                rgb_img = np.ascontiguousarray(rgb_img)
                encodings = face_recognition.face_encodings(rgb_img)
                if len(encodings) > 0:
                    known_encodings.append(encodings[0])
                    known_names.append(index_number)
                    count += 1
            except Exception:
                continue
                
    if count == 0:
        print("[FaceTrainer] No valid faces found in directory for background training.")
        return
        
    print(f"[FaceTrainer] Updating model with {count} images for Student Index {index_number}...")
    try:
        with open(ENCODINGS_PATH, "wb") as f:
            pickle.dump({"encodings": known_encodings, "names": known_names}, f)
        print(f"[FaceTrainer] Model successfully updated and saved to {ENCODINGS_PATH}")
        
        # Immediately overwrite the active Uvicorn inference thread memory 
        from routers.attendance import load_global_encodings
        load_global_encodings()
    except Exception as e:
        print(f"[FaceTrainer] Critical Error updating model: {e}")

def retrain_model():
    """
    Clears the existing models and rebuilds encodings.pkl
    from scratch iteratively crawling the dataset/ directories.
    """
    known_encodings = []
    known_names = []
    
    if not os.path.exists(DATASET_BASE_DIR / 'dataset'):
        print("[FaceTrainer] 'dataset' directory not found.")
        return
        
    folders = [f for f in os.listdir(DATASET_BASE_DIR / 'dataset') if os.path.isdir(DATASET_BASE_DIR / 'dataset' / f)]
    folders.sort() 
    
    for folder_name in folders:
        folder_full_path = DATASET_BASE_DIR / 'dataset' / folder_name
        for image_name in os.listdir(folder_full_path):
            image_path = os.path.join(folder_full_path, image_name)
            try:
                img = cv2.imread(image_path)
                if img is None: continue
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                rgb_img = np.ascontiguousarray(rgb_img)
                encodings = face_recognition.face_encodings(rgb_img)
                if len(encodings) > 0:
                    known_encodings.append(encodings[0])
                    known_names.append(folder_name)
            except Exception:
                continue

    if len(known_encodings) == 0:
        print("[FaceTrainer] Dataset empty. Cannot retrain empty model.")
        return

    print("\n[FaceTrainer] Retraining AI Model from scratch...")
    with open(ENCODINGS_PATH, "wb") as f:
        pickle.dump({"encodings": known_encodings, "names": known_names}, f)
    print(f"-> Model saved successfully as '{ENCODINGS_PATH}'!")
    
    # Broadcast native cache reset
    try:
        from routers.attendance import load_global_encodings
        load_global_encodings()
    except Exception as e:
        pass
