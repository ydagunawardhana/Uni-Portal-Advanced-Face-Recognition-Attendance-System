# UniPortal: Advanced Face Recognition Attendance System

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-F7931E?style=for-the-badge&logo=ai&logoColor=white)](https://groq.com/)
[![NVIDIA CUDA](https://img.shields.io/badge/NVIDIA_CUDA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-toolkit)

**UniPortal** is a state-of-the-art, AI-powered attendance management solution designed for modern educational institutions. This system leverages facial recognition biometrics to automate student attendance, providing 99% accuracy and eliminating proxy-based attendance.

---

## 👥 User Roles & Access Control

The system implements a strict Role-Based Access Control (RBAC) architecture with three primary user personas:

| Role              | Access Level | Primary Responsibilities                                                 |
| :---------------- | :----------- | :----------------------------------------------------------------------- |
| **Administrator** | Super-User   | System configuration, user management, audit logs, and global reporting. |
| **Lecturer**      | Faculty      | Session management, live class monitoring, student at-risk tracking.     |
| **Student**       | Self-Service | Viewing personal attendance, timetable access, and correction requests.  |

---

## 🌟 Key Features

### 🤖 Biometric Core & AI Engine

- **99% Recognition Accuracy**: High-precision student identification using FaceNet and OpenCV.
- **Dynamic Encoding Library**: Intelligent `encodings.pkl` system that auto-updates as new students enroll.
- **Anti-Proxy Logic**: Secure biometric verification that ensures physical presence.

### 🧠 Biometric Pipeline (How it works)

The system uses a multi-stage pipeline to identify students with high precision:

1.  **Face Detection (`haarcascade_frontalface_default.xml`)**: Uses OpenCV's Haar Cascades to find human faces in the camera frame.
2.  **Landmark Mapping (`shape_predictor_68_face_landmarks.dat`)**: Uses Dlib to identify 68 facial landmarks, allowing the system to align and "straighten" faces for consistent recognition.
3.  **Facial Encoding**: Converts the aligned face into a 128-dimensional mathematical vector (embedding).
4.  **Identity Matching (`encodings.pkl`)**: Compares the live vector against a database of stored student embeddings. If a match is found within a specific distance threshold, the identity is confirmed.

### 🏢 Admin Control Center

- **Institutional Analytics**: High-level dashboards showing weekly trends and department-wise performance.
- **User Management**: Unified interface for registering students, lecturers, and managing system roles.
- **Manual Overrides**: Powerful session management tool allowing administrators to correct attendance records manually.
- **Attendance Request Management**: Centralized workflow to approve or reject student-submitted manual correction requests.
- **System Audit Logs**: Comprehensive logging of all administrative actions for transparency and security.
- **Pre-Registration System**: Streamlined onboarding for new students with preliminary data collection.

### 👨‍🏫 Lecturer Portal

- **Class Management**: Personalized view of assigned modules, batches, and upcoming sessions.
- **At-Risk Tracking**: Automated flagging of students with attendance below 70% for early intervention.
- **Attendance Heatmaps**: Visual representation of student participation across different modules.
- **Live Class Monitoring**: Real-time dashboard showing active sessions, current headcounts, and biometric verification status.
- **Automated Reporting**: One-click generation of PDF and CSV reports for attendance statistics and student trends.
- **Timetable Upload**: CSV/Excel processing engine for bulk timetable and module scheduling.

### 💬 AI Support Assistant

- **Llama 3.1 Integration**: Context-aware chatbot powered by the Groq API.
- **Natural Language Support**: Handles queries about attendance corrections, camera errors, and portal navigation with professional, real-time responses.

### 📅 Scheduling & Communication

- **Smart Timetable**: Automated scheduling with conflict detection and student-specific views.
- **Lecturer Appointments**: Integrated booking system for students to schedule one-on-one meetings with faculty.
- **Profile Security**: Encrypted face data management and multi-factor security settings.

---

## 🛠️ Technology Stack

### **Frontend (Client Side)**

- **Framework**: React 18 (Vite) with TypeScript.
- **Styling**: Tailwind CSS (Custom Design System).
- **Visualization**: Recharts for dynamic data analytics.
- **Icons**: Lucide React for consistent UI patterns.

### **Backend (Server Side)**

- **API Engine**: FastAPI (Python 3.12).
- **ORM**: SQLAlchemy for scalable database interaction.
- **Biometrics**: `face_recognition` library, OpenCV, and Dlib.
- **Documentation**: Automatic OpenAPI (Swagger) integration.

### **Infrastructure**

- **Database**: PostgreSQL (Relational Data Storage).
- **Acceleration**: NVIDIA CUDA & cuDNN for GPU-accelerated facial recognition.
- **AI Processing**: Groq Cloud Inference for LLM-based support.

---

## ⚡ Hardware Acceleration (NVIDIA CUDA)

UniPortal is optimized for high-performance processing using **NVIDIA CUDA**:

- **Inference Speed**: Reduces face detection time from ~500ms (CPU) to **<20ms** (GPU).
- **Parallel Processing**: Thousands of GPU cores handle multiple simultaneous biometric streams.
- **Requirements**: NVIDIA GPU (Pascal or GTX 10-series, RTX-series, etc.), CUDA Toolkit 11.8+, cuDNN 8.x+, and NVIDIA Container Toolkit.

---

## 🔒 Security & Privacy

- **Encrypted Biometrics**: Facial embeddings are stored as hashed vectors, not raw images.
- **RBAC Security**: JWT-based authentication for all protected routes.
- **Data Integrity**: Foreign key constraints and transaction-safe database logic.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL Database

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in a `.env` file:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/attendance_db
   GROQ_API_KEY=your_groq_api_key
   SECRET_KEY=your_jwt_secret

   # SMTP Settings (For Password Reset)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password

   # Security & CORS
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the root directory:

   ```bash
   cd ..
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Developed with ❤️ by the **UniPortal Engineering Team**.

```
