"""
proper_accuracy_test.py
────────────────────────────────────────────────────────────────────────
UniPortal - Proper Face Recognition Accuracy Validation Script

METHOD:
  - Splits each student dataset: 80% for enrollment, 20% for testing
  - Builds a TEMPORARY encodings set from the 80% training images only
  - Tests the remaining 20% (genuinely unseen images) against it
  - Also tests cross-student confusion (does Student A get matched to Student B?)
  - Reports honest precision, recall, F1, and inference speed

HOW TO RUN:
    cd "d:\\Face Recognition  Attendance System\\backend"
    python proper_accuracy_test.py

This does NOT modify your real encodings.pkl file.
"""

import sys
import io
import pickle
import time
import numpy as np # type: ignore
from pathlib import Path
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import face_recognition # type: ignore
except ImportError:
    print("ERROR: face_recognition not installed.")
    sys.exit(1)

BASE_DIR     = Path(__file__).parent
DATASET_PATH = BASE_DIR / "dataset"
THRESHOLD    = 0.42
TRAIN_RATIO  = 0.80   # 80% enrollment, 20% test
IMAGE_EXTS   = {".jpg", ".jpeg", ".png", ".bmp"}
SEP  = "=" * 68
LINE = "-" * 68

print()
print(SEP)
print("  UniPortal - Proper Face Recognition Accuracy Validation")
print(f"  Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"  Method    : 80/20 Train-Test Split (Held-Out Test Set)")
print(f"  Threshold : {THRESHOLD} Euclidean Distance")
print(SEP)

# Step 1: Collect all images per student 
student_folders = sorted([d for d in DATASET_PATH.iterdir() if d.is_dir()])
all_students = {}

for folder in student_folders:
    images = sorted([f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS])
    if images:
        all_students[folder.name] = images

total_students = len(all_students)
print(f"\n  Enrolled Subjects Found : {total_students}")

# Step 2: Split and build temporary encodings from training set
print(f"\n  Building temporary encodings from 80% training images...")
print(f"  (This does NOT modify your real encodings.pkl)\n")

temp_encodings = []
temp_names     = []
test_images    = {}   # {student_name: [list of test image paths]}
train_counts   = {}

for student, images in all_students.items():
    split_idx = int(len(images) * TRAIN_RATIO)
    train_imgs = images[:split_idx]
    test_imgs  = images[split_idx:]

    train_counts[student] = len(train_imgs)
    test_images[student]  = test_imgs

    for img_path in train_imgs:
        try:
            img  = face_recognition.load_image_file(str(img_path))
            encs = face_recognition.face_encodings(img)
            if encs:
                temp_encodings.append(encs[0])
                temp_names.append(student)
        except Exception:
            pass

print(f"  Training vectors built : {len(temp_encodings)} from {total_students} students")
print(f"  Training split         : {int(TRAIN_RATIO*100)}% ({min(train_counts.values())}-{max(train_counts.values())} images/student)")
print(f"  Test split             : {int((1-TRAIN_RATIO)*100)}% (held-out, genuinely unseen)")

# Step 3: Run held-out test 
print()
print(LINE)
print(f"  {'Student':<12} {'Test Imgs':<11} {'Correct':<10} {'Wrong':<8} {'No Face':<9} {'Accuracy':>9}")
print(LINE)

total_correct  = 0
total_wrong    = 0
total_no_face  = 0
total_tests    = 0
inference_times = []
detail_errors  = []

for student, test_imgs in test_images.items():
    s_correct = s_wrong = s_no_face = 0

    for img_path in test_imgs:
        try:
            img  = face_recognition.load_image_file(str(img_path))
            t0   = time.perf_counter()
            locs = face_recognition.face_locations(img)
            encs = face_recognition.face_encodings(img, locs)
            ms   = (time.perf_counter() - t0) * 1000
            inference_times.append(ms)

            if not encs:
                s_no_face += 1
                continue

            dists     = face_recognition.face_distance(temp_encodings, encs[0])
            best_idx  = int(np.argmin(dists))
            best_dist = float(dists[best_idx])
            predicted = temp_names[best_idx] if best_dist <= THRESHOLD else "Unknown"

            if predicted == student:
                s_correct += 1
            else:
                s_wrong += 1
                detail_errors.append(
                    f"    {img_path.name}: Expected={student}, Got={predicted}, Dist={best_dist:.4f}"
                )

        except Exception as e:
            s_wrong += 1

    s_tests = s_correct + s_wrong
    total_correct += s_correct
    total_wrong   += s_wrong
    total_no_face += s_no_face
    total_tests   += s_tests

    acc = (s_correct / s_tests * 100) if s_tests > 0 else 0.0
    print(f"  {student:<12} {len(test_imgs):<11} {s_correct:<10} {s_wrong:<8} {s_no_face:<9} {acc:>8.1f}%")

# Step 4: Cross-Student Confusion Test
# Test: does a student's image get wrongly matched to another student?
print(LINE)

effective   = total_correct + total_wrong
overall_acc = (total_correct / effective * 100) if effective > 0 else 0.0
error_rate  = (total_wrong   / effective * 100) if effective > 0 else 0.0
avg_ms = float(np.mean(inference_times)) if inference_times else 0.0
min_ms = float(np.min(inference_times))  if inference_times else 0.0
max_ms = float(np.max(inference_times))  if inference_times else 0.0

total_shown = total_tests + total_no_face
print(f"  {'TOTAL':<12} {total_shown:<11} {total_correct:<10} {total_wrong:<8} {total_no_face:<9} {overall_acc:>8.2f}%")

# Step 5: Final Report
print()
print(SEP)
print("  OVERALL ACCURACY SUMMARY  (80/20 Held-Out Split)")
print(SEP)
print(f"  Total Test Images        : {total_shown}")
print(f"  No Face Detected         : {total_no_face}")
print(f"  Effective Tests          : {effective}")
print(f"  Correct Identifications  : {total_correct}")
print(f"  Wrong  Identifications   : {total_wrong}")
print()
print(f"  [RESULT] Overall Accuracy  : {overall_acc:.2f}%")
print(f"  [RESULT] Error Rate        : {error_rate:.2f}%")
print(f"  [SPEED]  Avg Inference     : {avg_ms:.1f} ms/frame")
print(f"  [SPEED]  Min Inference     : {min_ms:.1f} ms")
print(f"  [SPEED]  Max Inference     : {max_ms:.1f} ms")
print(f"  [CONFIG] Match Threshold   : {THRESHOLD}")
print(f"  [CONFIG] Train Split       : {int(TRAIN_RATIO*100)}%  |  Test Split: {int((1-TRAIN_RATIO)*100)}%")

print()
print(SEP)
print("  CLASSIFICATION METRICS (Binary: Correct Identity vs Wrong)")
print(SEP)

TP = total_correct
FP = total_wrong
FN = total_no_face

precision = (TP / (TP + FP) * 100) if (TP + FP) > 0 else 0.0
recall    = (TP / (TP + FN) * 100) if (TP + FN) > 0 else 0.0
f1        = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

print(f"  True Positives  (TP)     : {TP}  (correct student identified)")
print(f"  False Positives (FP)     : {FP}  (wrong student returned)")
print(f"  False Negatives (FN)     : {FN}  (face not detected)")
print()
print(f"  Precision                : {precision:.2f}%")
print(f"  Recall (Sensitivity)     : {recall:.2f}%")
print(f"  F1 Score                 : {f1:.2f}%")

if detail_errors:
    print()
    print(SEP)
    print("  MISCLASSIFICATION DETAIL")
    print(SEP)
    for err in detail_errors:
        print(err)

print()
print(SEP)
print("  End of Held-Out Accuracy Report - UniPortal System")
print(SEP)
print()
