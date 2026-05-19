"""
face_recognition_engine.py
──────────────────────────
Self-contained face recognition module optimized via Deep Learning mapped 
structurally to unify video streams and multipart POST API endpoints.
"""

from __future__ import annotations

import os
import pickle
from dataclasses import dataclass, field
from pathlib import Path
import face_recognition # type: ignore
import numpy as np # type: ignore
import cv2 # type: ignore

_BASE_DIR = Path(__file__).parent
ENCODINGS_PATH = str(_BASE_DIR / "encodings.pkl")

# Tuning knobs — tightened to 0.42 to reject family-member false positives
FACE_MATCH_THRESHOLD: float = 0.42
TOLERANCE = FACE_MATCH_THRESHOLD  # Alias kept for legacy compatibility

@dataclass
class FaceResult:
    label:      str
    user_id:    int   # Kept for strict backward structural parity (default 0)
    confidence: float # Euclidean Distance
    is_known:   bool
    bbox:       dict = field(default_factory=dict)   # {x, y, w, h}
    is_enrolled: bool = True
    color:       tuple = None

    def to_dict(self) -> dict:
        return {
            "label":      self.label,
            "user_id":    self.user_id,
            "confidence": round(self.confidence, 2),
            "is_known":   self.is_known,
            "bbox":       self.bbox,
        }

_known_encodings = []
_known_names = []
_last_encodings_mtime = 0.0

def _load_encodings():
    global _known_encodings, _known_names, _last_encodings_mtime
    
    try:
        current_mtime = os.path.getmtime(ENCODINGS_PATH)
    except OSError:
        current_mtime = 0.0

    if current_mtime > _last_encodings_mtime and current_mtime > 0:
        try:
            with open(ENCODINGS_PATH, "rb") as f:
                data = pickle.load(f)
                _known_encodings = data.get("encodings", [])
                _known_names = data.get("names", [])
            _last_encodings_mtime = current_mtime
            if _last_encodings_mtime > 0:
                print(f"[FaceEngine] Auto-reloading updated {ENCODINGS_PATH}")
        except Exception as e:
            print(f"[FaceEngine] Failed to load encodings: {e}")

# The signature accepts optional legacy args to prevent blowing up dependent controllers
def recognize_faces(frame: np.ndarray, cascade=None, recognizer=None) -> list[FaceResult]:
    """
    Detect and identify all faces in a single camera frame using FaceNet.
    Downscales processing dynamically ensuring hyper-fast sub-millisecond mappings.
    """
    _load_encodings()

    # Inference Matrix Acceleration
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = small_frame[:, :, ::-1]
    rgb_small_frame = np.ascontiguousarray(rgb_small_frame)
    
    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    results: list[FaceResult] = []

    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        # Scale back the coordinates natively
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4
        
        y = top
        x = left
        h = bottom - top
        w = right - left

        is_known = False
        label = "Unknown"
        distance = 1.0

        if len(_known_encodings) > 0:
            face_distances = face_recognition.face_distance(_known_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                distance = face_distances[best_match_index]
                
                # Strict threshold matching
                if distance <= TOLERANCE:
                    is_known = True
                    label = _known_names[best_match_index]

        results.append(FaceResult(
            label      = label,
            user_id    = 0, # Abandoned structural param
            confidence = distance, 
            is_known   = is_known,
            bbox       = {"x": x, "y": y, "w": w, "h": h},
        ))

    return results

def annotate_frame(frame: np.ndarray, results: list[FaceResult]) -> np.ndarray:
    out = frame.copy()
    for r in results:
        x, y, w, h = r.bbox["x"], r.bbox["y"], r.bbox["w"], r.bbox["h"]
        
        if r.color:
            color = r.color
        elif not r.is_known:
            color = (0, 255, 255) # Yellow
        elif r.is_enrolled:
            color = (0, 255, 0) # Green 
        else:
            color = (0, 0, 255) # Red 
        
        cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
        cv2.putText(out, str(r.label), (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return out
