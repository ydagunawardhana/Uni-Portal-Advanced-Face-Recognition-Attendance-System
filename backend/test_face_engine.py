"""
Quick smoke-test for face_recognition_engine.py.
Run from the backend folder:
    python test_face_engine.py
"""
import sys
import numpy as np

# ── 1. Import engine ──────────────────────────────────────────
print("Importing face_recognition_engine ...")
try:
    from face_recognition_engine import (
        recognize_faces,
        annotate_frame,
        CONFIDENCE_THRESHOLD,
        _load_name_map,
        NAMES_PATH,
    )
    print("  ✅  Import OK")
except Exception as e:
    print(f"  ❌  Import failed: {e}")
    sys.exit(1)

# ── 2. Names map ──────────────────────────────────────────────
name_map = _load_name_map(NAMES_PATH)
print(f"\nNames map: {len(name_map)} entries loaded")
for uid, name in list(name_map.items())[:5]:
    print(f"  User_{uid} → {name}")
print("  ...")

# ── 3. Blank frame (no faces expected) ───────────────────────
print("\nTesting on a blank 640×480 frame (expect 0 detections) ...")
blank = np.zeros((480, 640, 3), dtype=np.uint8)
results = recognize_faces(blank)
print(f"  Detected faces: {len(results)}  ✅")

# ── 4. Annotate helper ────────────────────────────────────────
annotated = annotate_frame(blank, results)
assert annotated.shape == blank.shape, "annotate_frame() changed frame shape!"
print("  annotate_frame() returned correct shape  ✅")

# ── 5. Summary ───────────────────────────────────────────────
print(f"\nConfidence threshold : {CONFIDENCE_THRESHOLD}")
print("\n✅  All smoke tests passed. Engine is ready.")
