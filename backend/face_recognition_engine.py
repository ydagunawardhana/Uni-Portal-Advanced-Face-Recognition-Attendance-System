"""
face_recognition_engine.py
──────────────────────────
Self-contained face recognition module for the Attendance System.

Public API
──────────
    recognize_faces(frame: np.ndarray) -> list[FaceResult]

Each FaceResult contains:
    - label       : str   – name from names.txt  (or "Unknown")
    - user_id     : int   – numeric label from the trainer (0 if unknown)
    - confidence  : float – LBPH confidence (lower = better match)
    - is_known    : bool  – True when confidence is below CONFIDENCE_THRESHOLD
    - bbox        : dict  – {x, y, w, h} bounding box in the original frame
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


# Paths  (all relative to this file so the module is portable)

_BASE_DIR   = Path(__file__).parent
CASCADE_PATH = str(_BASE_DIR / "haarcascade_frontalface_default.xml")
TRAINER_PATH = str(_BASE_DIR / "trainer.yml")
NAMES_PATH   = str(_BASE_DIR / "names.txt")


# Tuning knobs

# LBPH: confidence < threshold  → face is recognised
# Typical range: 50 (very strict) … 100 (lenient)
CONFIDENCE_THRESHOLD: float = float(os.getenv("FR_CONFIDENCE_THRESHOLD", "70"))

# Haar Cascade scaleFactor & minNeighbors
SCALE_FACTOR:   float = 1.3
MIN_NEIGHBORS:  int   = 5
MIN_FACE_SIZE:  tuple = (30, 30)   # ignore tiny detections



# Result dataclass

@dataclass
class FaceResult:
    label:      str
    user_id:    int
    confidence: float
    is_known:   bool
    bbox:       dict = field(default_factory=dict)   # {x, y, w, h}

    def to_dict(self) -> dict:
        return {
            "label":      self.label,
            "user_id":    self.user_id,
            "confidence": round(self.confidence, 2),
            "is_known":   self.is_known,
            "bbox":       self.bbox,
        }



# Module-level singletons (loaded once, reused for every call)

def _load_name_map(path: str) -> dict[int, str]:
    """
    Parse names.txt into {numeric_id: name}.

    Expected line format:
        User_1 : yalefaces_test
        User_42 : SUB59
    """
    name_map: dict[int, str] = {}
    pattern = re.compile(r"User_(\d+)\s*:\s*(.+)")
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                m = pattern.match(line)
                if m:
                    uid  = int(m.group(1))
                    name = m.group(2).strip()
                    name_map[uid] = name
    except FileNotFoundError:
        print(f"[FaceEngine] ⚠  names.txt not found at: {path}")
    return name_map


def _load_cascade(path: str) -> cv2.CascadeClassifier:
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        raise RuntimeError(
            f"[FaceEngine]  Failed to load Haar Cascade from: {path}\n"
            "Make sure haarcascade_frontalface_default.xml is in the backend folder."
        )
    print(f"[FaceEngine]  Haar Cascade loaded from: {path}")
    return cascade


def _load_recognizer(path: str) -> cv2.face.LBPHFaceRecognizer:
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    if not os.path.isfile(path):
        raise RuntimeError(
            f"[FaceEngine]  Trainer file not found: {path}\n"
            "Train the model first and place trainer.yml in the backend folder."
        )
    recognizer.read(path)
    print(f"[FaceEngine]  LBPH recognizer loaded from: {path}")
    return recognizer


# Lazy-load on first use so import failures don't crash the entire server
_cascade:    Optional[cv2.CascadeClassifier]      = None
_recognizer: Optional[cv2.face.LBPHFaceRecognizer] = None
_name_map:   Optional[dict[int, str]]             = None


def _get_resources():
    """Return (cascade, recognizer, name_map), loading them on first call."""
    global _cascade, _recognizer, _name_map
    if _cascade is None:
        _cascade    = _load_cascade(CASCADE_PATH)
        _recognizer = _load_recognizer(TRAINER_PATH)
        _name_map   = _load_name_map(NAMES_PATH)
    return _cascade, _recognizer, _name_map



# Core helpers

def _preprocess(frame: np.ndarray) -> np.ndarray:
    """Convert BGR frame to equalised grayscale for better detection."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return cv2.equalizeHist(gray)   # boost contrast


def _detect_faces(cascade: cv2.CascadeClassifier,
                  gray: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Run Haar Cascade and return a list of (x, y, w, h) bounding boxes."""
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=SCALE_FACTOR,
        minNeighbors=MIN_NEIGHBORS,
        minSize=MIN_FACE_SIZE,
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(faces) == 0:
        return []
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]



# Public API

def recognize_faces(frame: np.ndarray) -> list[FaceResult]:
    """
    Detect and identify all faces in a single camera frame.

    Parameters
    ----------
    frame : np.ndarray
        BGR image as returned by cv2.VideoCapture.read() or decoded from JPEG.

    Returns
    -------
    list[FaceResult]
        One FaceResult per detected face.  Empty list when no faces are found.

    Example
    -------
    >>> cap = cv2.VideoCapture(0)
    >>> ret, frame = cap.read()
    >>> results = recognize_faces(frame)
    >>> for r in results:
    ...     print(r.label, r.confidence, r.is_known)
    """
    cascade, recognizer, name_map = _get_resources()

    gray  = _preprocess(frame)
    boxes = _detect_faces(cascade, gray)

    results: list[FaceResult] = []

    for (x, y, w, h) in boxes:
        roi = gray[y : y + h, x : x + w]

        # Resize ROI to a fixed size (LBPH is not size-invariant)
        roi_resized = cv2.resize(roi, (200, 200))

        user_id, confidence = recognizer.predict(roi_resized)

        is_known = confidence < CONFIDENCE_THRESHOLD
        label    = name_map.get(user_id, "Unknown") if is_known else "Unknown"

        results.append(FaceResult(
            label      = label,
            user_id    = user_id    if is_known else 0,
            confidence = confidence,
            is_known   = is_known,
            bbox       = {"x": x, "y": y, "w": w, "h": h},
        ))

    return results


def annotate_frame(frame: np.ndarray,
                   results: list[FaceResult]) -> np.ndarray:
    """
    Draw bounding boxes and labels on a copy of the frame.
    Returns the annotated frame (does NOT mutate the original).

    Useful for debugging or for the video-stream endpoint.
    """
    out = frame.copy()
    for r in results:
        x, y, w, h = r.bbox["x"], r.bbox["y"], r.bbox["w"], r.bbox["h"]
        color = (0, 200, 0) if r.is_known else (0, 0, 220)   # green / red

        cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)

        tag = f"{r.label}  ({r.confidence:.1f})"
        # Background rectangle for legibility
        (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(out, (x, y - th - 8), (x + tw + 4, y), color, -1)
        cv2.putText(out, tag, (x + 2, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    return out
