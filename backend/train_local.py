import os
import pickle
import face_recognition # type: ignore

dataset_path = 'dataset'
encodings_save_path = 'encodings.pkl'

known_encodings = []
known_names = []

print("Reading local dataset and generating Deep Learning encodings...")

if not os.path.exists(dataset_path):
    print("Dataset folder not found!")
    exit()

for student_folder in os.listdir(dataset_path):
    folder_path = os.path.join(dataset_path, student_folder)
    
    if not os.path.isdir(folder_path):
        continue

    print(f"\nProcessing student: {student_folder}")
    success_count = 0

    for image_name in os.listdir(folder_path):
        image_path = os.path.join(folder_path, image_name)
        try:
            # 1. Load image using native Dlib parser over the now-full color RGB frame!
            rgb_img = face_recognition.load_image_file(image_path)
            
            # 2. Extract locations via contextual HOG natively mapping the full bounding frame
            locations = face_recognition.face_locations(rgb_img, model="hog")
            
            if len(locations) > 0:
                # 3. Securely map geometry to encoding 
                encodings = face_recognition.face_encodings(rgb_img, known_face_locations=locations)
                
                if len(encodings) > 0:
                    known_encodings.append(encodings[0])
                    known_names.append(student_folder)
                    success_count += 1
                    print(f"  [+] Encoded successfully: {image_name}")
                else:
                    print(f"  [-] Failed to generate 128D vector: {image_name}")
            else:
                print(f"  [!] No face detected natively: {image_name}")

        except Exception as e:
            print(f"  [X] System error on {image_name}: {e}")

    print(f">>> Successfully encoded {success_count} images for {student_folder}")

print("\nSaving Deep Learning Model...")
with open(encodings_save_path, "wb") as f:
    pickle.dump({"encodings": known_encodings, "names": known_names}, f)

print(f"-> Model saved successfully as '{encodings_save_path}'!")
print(f"Total faces encoded: {len(known_encodings)}")