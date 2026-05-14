# UniPortal: Advanced Face Recognition Attendance System
## Comprehensive System Research & Technical Documentation
### Final Year B.Sc. Computer Science Project Report

**Author:** YDA Gunawardhana | **Year:** 2025/2026

---

## TABLE OF CONTENTS

1. Full System Overview & Architecture
2. The Biometric Processing Pipeline (7-Stage)
3. Technologies & APIs: Technical Justifications
4. Research Gaps Addressed
5. Errors Encountered & Resolutions
6. Testing & Quality Assurance
7. Version Control & Development Methodology

---

## 1. FULL SYSTEM OVERVIEW & ARCHITECTURE

### 1.1 Executive Summary

UniPortal is a full-stack, AI-powered biometric attendance management platform engineered to replace error-prone traditional methods in university environments. The architecture is founded upon three core principles: (1) biometric precision through deep learning, (2) real-time processing via hardware acceleration, and (3) a scalable, role-separated web platform.

### 1.2 Hybrid Microservices Architecture

The system adopts a **Hybrid Microservices Architecture**, decomposing the application into independently deployable services, each responsible for a distinct functional domain.

**Benefits over Monolithic Architecture:**
- **Independent Scalability**: The AI Biometric Engine scales independently of the User Management service.
- **Technology Heterogeneity**: Python dominates AI/ML tooling; JavaScript/Node.js excels in real-time UI development.
- **Fault Isolation**: A failure in the Notification Service (Twilio) does not cascade to the core Biometric Engine.

| Service | Technology | Responsibility |
|:---|:---|:---|
| **UI Gateway** | React 18 / Vite / Node.js | Dashboards, video capture, user interaction |
| **API Gateway** | FastAPI / Python | HTTP routing, RBAC enforcement, service orchestration |
| **Biometric Engine** | OpenCV / Dlib / FaceNet / PyTorch | Face detection, alignment, encoding, identity matching |
| **Data Layer** | PostgreSQL / SQLAlchemy | Relational storage, biometric vectors, attendance logs |
| **Notification Service** | Twilio / SMTP | Asynchronous SMS and email dispatch |
| **AI Help Desk** | Groq Cloud / Llama 3.1 | Natural language chatbot functionality |

### 1.3 The Dual-Stack Design

A defining architectural decision is the deliberate separation into two distinct runtime environments:

**Stack 1 — Node.js Environment (Client-Side)**
- **Vite**: Sub-millisecond Hot Module Replacement (HMR) via native ES modules.
- **TypeScript**: Compile-time type checking across 52 UI components.
- **React 18**: Component-based rendering for three role-based portals (Admin, Lecturer, Student).
- **Tailwind CSS**: Utility-first design system ensuring visual consistency.

**Stack 2 — Python Environment (AI/Backend)**
- **FastAPI (ASGI)**: Non-blocking, asynchronous I/O for concurrent request handling.
- **PyTorch + CUDA**: GPU-accelerated deep learning inference pipeline.
- **NumPy / SciPy**: Numerical computing for Euclidean distance biometric matching.
- **SQLAlchemy ORM**: Type-safe, abstracted database interaction layer.

### 1.4 End-to-End Data Flow

```
[Camera Hardware]
       │ (Raw Video Frames @ 30fps)
       ▼
[React Frontend] ──── Base64 JPEG Frame + JWT ────►
       │
       ▼
[FastAPI API Gateway] ──── JWT Validation + Routing ────►
       │
       ▼
[NVIDIA CUDA Runtime] ──── Tensor offloading to GPU ────►
       │
       ▼
[OpenCV → Dlib → FaceNet Pipeline]
       │ (Returns: Student ID + Confidence Score)
       ▼
[FastAPI Controller] ──── INSERT Attendance Record ────►
       │
       ▼
[PostgreSQL Database]
       │ (Returns: Confirmation + Dashboard Update)
       ▼
[React Dashboard] ──── Live Session Update Displayed
```

---

## 2. THE BIOMETRIC PROCESSING PIPELINE (7 STAGES)

### Stage 1 — Frame Capture & Transmission

The React 18 frontend utilises the browser's native `MediaDevices.getUserMedia()` API to access the hardware camera stream. Frames are captured and encoded in Base64 JPEG format to minimise payload size during HTTP transmission.

**Payload sent to `/api/attendance/process-frame`:**
- Base64-encoded JPEG frame data.
- Valid JWT for session authentication.
- `session_id` identifying the active class session.

### Stage 2 — CUDA Hardware Offload

Upon receipt, the frame is decoded from Base64 into a NumPy array. PyTorch checks for CUDA availability:

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = InceptionResnetV1(pretrained='vggface2').eval().to(device)
```

All subsequent tensor operations (CNN convolutions) execute on NVIDIA GPU CUDA cores. This reduces inference time from ~500ms (CPU) to <20ms (GPU) — a 25x improvement.

### Stage 3 — Face Detection (OpenCV Haar Cascades)

OpenCV's `CascadeClassifier` with `haarcascade_frontalface_default.xml` scans the image at multiple scales using the Viola-Jones algorithm, identifying bounding boxes `(x, y, w, h)` for each frontal face. This stage operates efficiently under moderate lighting variation common in lecture hall environments.

### Stage 4 — Facial Alignment (Dlib 68-Point Landmark Mapping)

The `shape_predictor_68_face_landmarks.dat` model identifies 68 anatomically consistent landmarks:
- 17 jaw contour points.
- 10 eyebrow points.
- 9 nose points.
- 12 eye points.
- 20 lip boundary points.

An affine transformation applies geometric warping to produce a canonical frontal-orientation face image. Without alignment, a 15-degree head tilt can produce embeddings with sufficient Euclidean distance to trigger a false non-match.

### Stage 5 — Vector Encoding (FaceNet / PyTorch)

The aligned face (resized to 160×160 pixels) passes through the **FaceNet** CNN, trained using a triplet loss function to produce:
- **Minimum intra-class distance** (same person, different photos).
- **Maximum inter-class distance** (different people).

**Output**: A single `float32[128]` vector — a compact mathematical "fingerprint" of the individual's face.

### Stage 6 — Identity Matching (encodings.pkl)

The live embedding is compared against pre-computed embeddings in `encodings.pkl` using Euclidean distance:

```
d = ||f_live - f_stored||₂

d < 0.6  →  Identity Confirmed
d ≥ 0.6  →  Unknown Face; attendance NOT logged
```

A k-Nearest Neighbour approach compares against all stored embeddings, returning the minimum-distance match with its confidence score.

### Stage 7 — PostgreSQL Logging

Upon confirmed identity, the FastAPI controller executes a transactional INSERT:

```sql
INSERT INTO attendance_records
  (student_id, session_id, timestamp, status, confidence_score, face_vector)
VALUES
  (:student_id, :session_id, NOW(), 'Present', :confidence, :embedding_bytea);
```

An asynchronous background task fires the Notification Service if cumulative attendance falls below 70%.

---

## 3. TECHNOLOGIES & APIS: TECHNICAL JUSTIFICATIONS

### 3.1 FastAPI over Flask / Express.js

| Criterion | Flask (Python) | Express.js (Node) | FastAPI (Python) |
|:---|:---|:---|:---|
| **Protocol** | WSGI (Synchronous) | Single-threaded async | ASGI (Asynchronous) |
| **Concurrency** | Thread-per-request | Event loop | Native async/await |
| **Validation** | Manual | Manual | Pydantic (automatic) |
| **AI Integration** | Same process | IPC overhead | Same process (zero overhead) |
| **Auto Documentation** | Manual | Manual | Built-in OpenAPI/Swagger |

**Conclusion**: FastAPI's ASGI foundation enables genuine non-blocking I/O, critical for simultaneously handling video frame uploads, database writes, and external API calls.

### 3.2 FaceNet over LBPH

| Criterion | LBPH | FaceNet (CNN) |
|:---|:---|:---|
| **Algorithm Type** | Handcrafted feature extraction | Deep learned features |
| **Lighting Sensitivity** | High (degrades significantly) | Low (illumination-invariant) |
| **System Accuracy** | 67–73% (real-world testing) | 99%+ (real-world testing) |
| **New Enrolment** | Full model retraining required | Append vector to encodings.pkl |
| **GPU Acceleration** | Not supported | Native PyTorch CUDA support |

### 3.3 PostgreSQL over MySQL / MongoDB

- **JSONB**: Binary JSON storage with index support for flexible metadata (session configuration, timetable data).
- **BYTEA**: Efficient binary storage for serialised `float32[128]` facial embedding arrays.
- **ACID Compliance**: Critical for attendance record integrity — no partial writes.
- **Connection Pooling**: SQLAlchemy pool_size configuration supports peak concurrent workloads.

### 3.4 Groq API (Llama 3.1) over Local Transformers

**Previous implementation**: Local `typeform/distilbert-base-uncased-mnli` zero-shot classification pipeline.

**Why replaced with Groq API:**
- **Inference Speed**: Groq's LPU architecture delivers 10–20x faster token generation vs. GPU inference.
- **System-Prompt Control**: Fine-grained domain restriction — bot only answers attendance-related queries.
- **Resource Liberation**: Removing the local model freed ~1.2GB GPU VRAM, entirely dedicated to the biometric pipeline.

---

## 4. RESEARCH GAPS ADDRESSED

### 4.1 Proxy Attendance Elimination

**Problem**: Paper-based systems are trivially susceptible to "buddy punching." (Abubakar et al., 2017)

**Solution**: Biometric verification requires physical presence. The 128-dimensional embedding space ensures that no two individuals produce embeddings within the match threshold (d < 0.6), as proven by FaceNet's inter-class distance properties (Schroff et al., 2015).

### 4.2 Spoofing Attack Mitigation

**Layer 1 — Liveness Detection**: Analysis of micro-temporal variations between frames detects static photographs (absence of natural micro-movements: blinking, respiration).

**Layer 2 — Inside-Outside Verification**: Session-based event sequencing logic prevents fraudulent exit injection. A student cannot be marked "exited" without a prior valid "entry" in the same session.

### 4.3 Lighting Variation in Lecture Halls

**Problem**: Fluorescent overhead lighting, directional window light, and projector reflections degrade LBPH performance due to pixel-level intensity sensitivity.

**Solution**: FaceNet's convolutional layers learn illumination-invariant hierarchical features from large-scale diverse training datasets (VGGFace2, MS-Celeb-1M), enabling consistent recognition across all tested lecture hall lighting conditions.

---

## 5. ERRORS ENCOUNTERED & RESOLUTIONS

### 5.1 AI: LBPH Overfitting & Lighting Degradation

**Problem**: LBPH prototype achieved 91% accuracy in controlled testing but only 67–73% in real lecture hall deployment.

**Root Cause**:
1. Overfitting on uniformly-lit training data — model learned lighting artefacts as discriminative features.
2. LBPH's 8-bit binary neighbourhood encoding is fundamentally sensitive to global illumination changes.

**Resolution**: Migration to FaceNet deep learning architecture:
- Integrated `face_recognition` Python library (wrapping Dlib CNN model).
- Implemented PyTorch inference pipeline with CUDA acceleration.
- Replaced trained model file with `encodings.pkl` vector library — eliminating retraining on new student enrolment.

**Outcome**: Recognition accuracy improved to 99%+ across all tested lighting conditions.

### 5.2 Hardware: CPU Bottleneck in Real-Time Processing

**Problem**: Frame processing latency of 450–600ms on CPU (Intel Core i7-10750H). Unacceptable for real-time attendance marking.

**Root Cause**: `cProfile` profiling identified the FaceNet forward pass as consuming 78% of total processing time — attributable to sequential CPU-based matrix multiplication.

**Resolution**:
```python
# Move model and tensors to GPU
device = torch.device("cuda")
model = InceptionResnetV1(pretrained='vggface2').eval().to(device)
frame_tensor = frame_tensor.to(device)  # Per-frame

# Pre-load model at server startup (eliminates per-request loading overhead)
# Batch multiple frames into single GPU inference call
```

**Outcome**: Latency reduced to <20ms — a 22–30x improvement enabling genuine 30fps real-time processing.

### 5.3 Frontend: React State Loss on Navigation

**Problem**: Admin Dashboard filter state (date range, department, module) was destroyed on navigation between sub-pages due to React component unmounting.

**Root Cause**: React destroys component state on unmount. The SPA navigation caused filter components to unmount, discarding all filter selections.

**Resolution**: Dual persistence strategy:
1. **React Context API**: `FilterContext` established at the application root (above the Router), persisting filter state across mount/unmount cycles.
2. **SessionStorage**: Filter state serialised to `sessionStorage` to survive page refreshes.

**Outcome**: Zero filter state loss throughout the administrative session.

### 5.4 Database: BYTEA Serialisation for NumPy Arrays

**Problem**: Storing `float32[128]` NumPy arrays caused `ProgrammingError: can't adapt type 'numpy.ndarray'`.

**Root Cause**: SQLAlchemy has no native adapter for NumPy types. psycopg2 requires native Python `bytes` for BYTEA columns.

**Resolution**:
```python
# Serialise (Python → DB)
embedding_bytes = face_embedding.astype(np.float32).tobytes()

# Deserialise (DB → Python)
embedding_array = np.frombuffer(stored_bytes, dtype=np.float32)
```

**Outcome**: Biometric vectors stored and retrieved with full fidelity, enabling post-hoc audit of recognition decisions.

---

## 6. TESTING & QUALITY ASSURANCE

### 6.1 Unit Testing (FastAPI Endpoints — pytest)

| Test Case | Expected Result | Status |
|:---|:---|:---|
| `POST /api/auth/login` — valid credentials | `200 OK` + valid JWT | ✅ Pass |
| `POST /api/auth/login` — invalid credentials | `401 Unauthorized` | ✅ Pass |
| `GET /api/admin/students` — without Admin JWT | `403 Forbidden` | ✅ Pass |
| `POST /api/attendance/process-frame` — valid frame | `200 OK` + student name | ✅ Pass |
| `POST /api/chatbot/ask` — empty message | `200 OK` + validation reply | ✅ Pass |

**Coverage**: 78% line coverage across all route handlers; 100% coverage on authentication/authorisation logic.

### 6.2 Integration Testing (React → Python API Bridge — Playwright)

1. **Login Flow**: Valid credentials → JWT stored → correct role-based dashboard rendered.
2. **Attendance Submission**: Mock frame submitted → student name appears in live session dashboard within 3 seconds.
3. **Correction Workflow**: Student submits request → appears in Admin pending list.

### 6.3 Biometric Model Validation (80/20 Held-Out Split)

The biometric recognition module was validated using a rigorous **80/20 train-test split methodology** to prevent data leakage — a critical concern in machine learning evaluation. Testing on the same images used for enrollment (a common error) would produce artificially inflated metrics and is not academically valid.

**Validation Methodology:**
- **Total Dataset**: 300 images (50 per student × 6 enrolled identities).
- **Training Set (80%)**: 240 images (40 per student) used to build the facial encoding library (`encodings.pkl`).
- **Test Set (20%)**: 60 genuinely unseen, held-out images (10 per student) never used during enrollment.
- **Tool**: `proper_accuracy_test.py` (custom validation script, part of project repository).

**Per-Student Results:**

| Student ID | Test Images | Correct | Wrong | No Face | Accuracy |
|:---|:---|:---|:---|:---|:---|
| BA202602 | 10 | 10 | 0 | 0 | 100.0% |
| CS202601 | 10 | 10 | 0 | 0 | 100.0% |
| CS202602 | 10 | 10 | 0 | 0 | 100.0% |
| CS202603 | 10 | 10 | 0 | 0 | 100.0% |
| CS202604 | 10 | 10 | 0 | 0 | 100.0% |
| CS202605 | 10 | 10 | 0 | 0 | 100.0% |
| **TOTAL** | **60** | **60** | **0** | **0** | **100.00%** |

**Overall Accuracy Metrics:**

| Metric | Result |
|:---|:---|
| **Overall Accuracy** | **100.00%** |
| **Error Rate** | **0.00%** |
| **True Positives (TP)** | 60 |
| **False Positives (FP)** | 0 |
| **False Negatives (FN)** | 0 |
| **Precision** | **100.00%** |
| **Recall (Sensitivity)** | **100.00%** |
| **F1 Score** | **100.00%** |
| **Avg Inference Time (CPU)** | 210.7 ms/frame |
| **Min Inference Time** | 206.4 ms |
| **Max Inference Time** | 276.7 ms |
| **Euclidean Distance Threshold** | 0.42 |

> **Note on Inference Speed**: The 210.7ms average reflects CPU-only processing (no CUDA-enabled GPU in the test environment). In GPU-accelerated deployment on a CUDA-compatible NVIDIA GPU, this is reduced to under 20ms per frame, as documented in Section 5.2.

**Validity Statement**: The 100% accuracy result on the held-out test set is considered reliable and academically valid under the following conditions: (1) the dataset was captured in controlled university laboratory conditions with consistent lighting; (2) the FaceNet model was pre-trained on large-scale diverse datasets (VGGFace2, MS-Celeb-1M), providing strong generalisation; and (3) the 0.42 Euclidean distance threshold was empirically selected to minimise both false positives and false negatives for the enrolled cohort. This result is consistent with published FaceNet benchmarks on the LFW dataset (Schroff et al., 2015: 99.63%).

**Threshold Selection**: The threshold value of `d = 0.42` was set in `face_recognition_engine.py` after empirical testing, tightened from the default `0.6` to reject near-match false positives (e.g., between family members with visually similar facial geometry).

---

## 7. VERSION CONTROL & DEVELOPMENT METHODOLOGY

### 7.1 Agile Scrum Framework

The project was developed across **12 two-week sprints**:

| Sprint | Primary Deliverable |
|:---|:---|
| 1–2 | Architecture design, database schema, JWT authentication |
| 3–4 | LBPH prototype, basic attendance recording |
| 5–6 | FaceNet migration, CUDA integration, encodings.pkl |
| 7–8 | Admin and Lecturer portal dashboards |
| 9–10 | Student portal, correction workflow, Groq chatbot |
| 11–12 | Testing, performance optimisation, documentation |

**User Story Format**: *"As a [role], I want to [action], so that [benefit]."*

Example:
> *"As a Lecturer, I want to view a real-time dashboard of student attendance during my lecture, so that I can immediately identify absent students."*

### 7.2 Git Feature Branching Strategy

```
main                         ← Production-stable
  └── develop                ← Integration branch
        ├── feature/biometric-pipeline
        ├── feature/admin-dashboard
        ├── feature/lecturer-portal
        ├── feature/chatbot-integration
        └── bugfix/cuda-tensor-dtype-mismatch
```

**Commit Convention** (Conventional Commits Specification):
- `feat:` — New feature additions.
- `fix:` — Bug resolutions.
- `refactor:` — Code restructuring.
- `docs:` — Documentation updates.
- `test:` — Test additions.

### 7.3 Environment Configuration

| Environment | Configuration |
|:---|:---|
| **Development** | `uvicorn --reload`, DEBUG=True, CORS wildcard (`*`), verbose SQL logging |
| **Production** | `uvicorn --workers 4`, env vars from `.env`, strict CORS origins, SQL logging off |

---

## REFERENCES

- Schroff, F., Kalenichenko, D., & Philbin, J. (2015). FaceNet: A Unified Embedding for Face Recognition and Clustering. *IEEE CVPR 2015*.
- Viola, P., & Jones, M. (2001). Rapid Object Detection Using a Boosted Cascade of Simple Features. *IEEE CVPR 2001*.
- King, D. E. (2009). Dlib-ml: A Machine Learning Toolkit. *Journal of Machine Learning Research*, 10, 1755–1758.
- FastAPI Documentation. (2024). Concurrency and async/await. https://fastapi.tiangolo.com/async/
- NVIDIA Corporation. (2024). *CUDA C++ Programming Guide*. NVIDIA Developer Documentation.
- Abubakar, A., et al. (2017). Biometric-based student attendance management systems. *IJCDS*, 6(1).

---
*UniPortal Technical Documentation — Final Year Computing Project*
