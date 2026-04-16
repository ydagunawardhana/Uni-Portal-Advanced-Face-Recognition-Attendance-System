import cv2
import numpy as np
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TRAINER_PATH = str(BASE_DIR / "trainer.yml")
DATASET_BASE_DIR = BASE_DIR
NAMES_FILE_PATH = str(BASE_DIR / "names.txt")

def sync_names_file(index_number: str) -> int:
    """
    Appends the new index number to names.txt if it doesn't exist.
    Returns the integer ID (line index) to be used for LBPH training.
    """
    names = []
    
    # Read existing names
    if os.path.exists(NAMES_FILE_PATH):
        with open(NAMES_FILE_PATH, 'r') as f:
            names = [line.strip() for line in f.readlines()]
            
    # Add new student if not already in the list
    if index_number not in names:
        names.append(index_number)
        with open(NAMES_FILE_PATH, 'w') as f:
            for name in names:
                f.write(f"{name}\n")
                
    # The LBPH integer ID is the index of the string in the list
    return names.index(index_number)

def update_face_model(index_number: str, dataset_path: str):
    """
    Incrementally updates the LBPH face recognition model with new student faces.
    Runs asynchronously in the background.
    """
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    model_exists = os.path.exists(TRAINER_PATH)
    
    if model_exists:
        try:
            recognizer.read(TRAINER_PATH)
        except Exception as e:
            print(f"[FaceTrainer] Warning: Failed to load existing model: {e}")
            model_exists = False
    
    faces = []
    ids = []
    folder_path = DATASET_BASE_DIR / dataset_path
    
    if not folder_path.exists():
        print(f"[FaceTrainer] Dataset path {folder_path} does not exist.")
        return
        
    lbph_id = sync_names_file(index_number)
        
    for file in os.listdir(folder_path):
        if file.lower().endswith(('.png', '.jpg', '.jpeg')):
            img_path = str(folder_path / file)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                # Resize to standard size for LBPH
                img_resized = cv2.resize(img, (200, 200))
                faces.append(img_resized)
                ids.append(lbph_id)
                
    if not faces:
        print("[FaceTrainer] No valid faces found in directory for background training.")
        return
        
    print(f"[FaceTrainer] Updating model with {len(faces)} images for Student Index {index_number} (LBPH ID {lbph_id})...")
    try:
        if model_exists:
            recognizer.update(faces, np.array(ids))
        else:
            recognizer.train(faces, np.array(ids))
            
        recognizer.write(TRAINER_PATH)
        print(f"[FaceTrainer] Model successfully updated and saved to {TRAINER_PATH}")
    except Exception as e:
        print(f"[FaceTrainer] Critical Error updating model: {e}")
