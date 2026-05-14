import sys
import io
import os
import pickle
import time
import numpy as np
from pathlib import Path
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import face_recognition
except ImportError:
    print("ERROR: face_recognition not installed. Run: pip install face_recognition")
    sys.exit(1)

BASE_DIR       = Path(__file__).parent
ENCODINGS_PATH = BASE_DIR / "encodings.pkl"
DATASET_PATH   = BASE_DIR / "dataset"
THRESHOLD      = 0.42

SEP  = "=" * 65
LINE = "-" * 65

print()
print(SEP)
print("  UniPortal - Face Recognition Accuracy Validation Report")
print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(SEP)

if not ENCODINGS_PATH.exists():
    print("ERROR: encodings.pkl not found.")
    sys.exit(1)

with open(ENCODINGS_PATH, "rb") as f:
    data = pickle.load(f)

known_encodings = data.get("encodings", [])
known_names     = data.get("names", [])

print(f"\n  Loaded      : encodings.pkl")
print(f"  Identities  : {len(set(known_names))} enrolled students")
print(f"  Vectors     : {len(known_encodings)} stored face encodings")
print(f"  Threshold   : {THRESHOLD} (Euclidean distance)")

student_folders = [d for d in DATASET_PATH.iterdir() if d.is_dir()]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp"}

print(f"\n  Dataset     : {DATASET_PATH}")
print(f"  Subjects    : {len(student_folders)} student folders found")

print()
print(LINE)
print(f"  {'Student ID':<15} {'Images':<8} {'Correct':<10} {'Wrong':<8} {'Accuracy':>10}")
print(LINE)

total_tests   = 0
total_correct = 0
total_wrong   = 0
total_no_face = 0
inference_times = []

for folder in sorted(student_folders):
    expected_name = folder.name
    images = [f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS]

    s_tests = s_correct = s_wrong = s_no_face = 0

    for img_path in images:
        try:
            image     = face_recognition.load_image_file(str(img_path))
            t0        = time.perf_counter()
            face_locs = face_recognition.face_locations(image)
            face_encs = face_recognition.face_encodings(image, face_locs)
            elapsed   = (time.perf_counter() - t0) * 1000
            inference_times.append(elapsed)

            if not face_encs:
                s_no_face += 1
                continue

            distances = face_recognition.face_distance(known_encodings, face_encs[0])
            best_idx  = int(np.argmin(distances))
            best_dist = float(distances[best_idx])

            predicted = known_names[best_idx] if best_dist <= THRESHOLD else "Unknown"

            s_tests += 1
            if predicted == expected_name:
                s_correct += 1
            else:
                s_wrong += 1

        except Exception as e:
            s_wrong += 1

    total_tests   += s_tests
    total_correct += s_correct
    total_wrong   += s_wrong
    total_no_face += s_no_face

    acc = (s_correct / s_tests * 100) if s_tests > 0 else 0.0
    print(f"  {expected_name:<15} {len(images):<8} {s_correct:<10} {s_wrong:<8} {acc:>9.1f}%")

effective = total_tests
overall_acc = (total_correct / effective * 100) if effective > 0 else 0.0
error_rate  = (total_wrong   / effective * 100) if effective > 0 else 0.0
avg_inf     = float(np.mean(inference_times)) if inference_times else 0.0
min_inf     = float(np.min(inference_times))  if inference_times else 0.0
max_inf     = float(np.max(inference_times))  if inference_times else 0.0

print(LINE)
print(f"  {'TOTAL':<15} {total_tests + total_no_face:<8} {total_correct:<10} {total_wrong:<8} {overall_acc:>9.2f}%")

print()
print(SEP)
print("  OVERALL ACCURACY SUMMARY")
print(SEP)
print(f"  Total Images in Dataset  : {total_tests + total_no_face}")
print(f"  Images with No Face      : {total_no_face}")
print(f"  Effective Tests Run      : {effective}")
print(f"  Correct Identifications  : {total_correct}")
print(f"  Wrong  Identifications   : {total_wrong}")
print()
print(f"  [PASS] Overall Accuracy  : {overall_acc:.2f}%")
print(f"  [FAIL] Error Rate        : {error_rate:.2f}%")
print(f"  [TIME] Avg Inference     : {avg_inf:.1f} ms/frame")
print(f"  [TIME] Min Inference     : {min_inf:.1f} ms")
print(f"  [TIME] Max Inference     : {max_inf:.1f} ms")
print(f"  [CFG]  Match Threshold   : {THRESHOLD}")

print()
print(SEP)
print("  CLASSIFICATION METRICS")
print(SEP)

TP = total_correct
FP = total_wrong
FN = total_no_face

precision = (TP / (TP + FP) * 100) if (TP + FP) > 0 else 0.0
recall    = (TP / (TP + FN) * 100) if (TP + FN) > 0 else 0.0
f1        = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

print(f"  True Positives  (TP)     : {TP}")
print(f"  False Positives (FP)     : {FP}")
print(f"  False Negatives (FN)     : {FN}")
print()
print(f"  Precision                : {precision:.2f}%")
print(f"  Recall (Sensitivity)     : {recall:.2f}%")
print(f"  F1 Score                 : {f1:.2f}%")
print()
print(SEP)
print("  End of Report - UniPortal Face Recognition Accuracy Test")
print(SEP)
print()
