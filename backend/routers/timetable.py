import re
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, File
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
import pandas as pd
from database import get_db
from models import Timetable, Module, Lecturer
from utils.audit_logger import log_audit_action

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

@router.get("/template")
async def download_timetable_template():
    """
    Generates and serves a standardized Excel template for timetable uploads.
    """
    # 1. Define the schema
    columns = [
        'Date', 'Day', 'Start Time', 'End Time', 
        'Module Code', 'Module Name', 'Lecturer', 'Location'
    ]
    
    # 2. Add instructional placeholder data and one guidance row
    sample_data = [
        ['[Format: YYYY-MM-DD]', '[e.g., Monday]', '[Format: 09:00 AM]', '[Format: 11:00 AM]', 
         '[e.g., PUSL2022]', '[e.g., Introduction to IOT]', '[Must match System Name]', '[e.g., Lab 01]'],
        ['2026-05-04', 'Monday', '09:00 AM', '11:00 AM', 
         'PUSL2022', 'Introduction to IOT', 'Mr. Lecturer Name', 'Hall A']
    ]
    
    # 3. Create DataFrame
    df = pd.DataFrame(sample_data, columns=columns)
    
    # 4. Save to in-memory buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    
    output.seek(0)
    
    # 5. Serve the file
    headers = {
        'Content-Disposition': 'attachment; filename=Standard_Timetable_Template.xlsx'
    }
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers=headers
    )

# Mapping for weekday offsets
DAY_OFFSET = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6
}

@router.post("/extract")
async def extract_standard_timetable(
    file: UploadFile = File(...),
    faculty: str = Form(...),
    department: str = Form(...),
    batch: str = Form(...),
    semester: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Standardized ETL endpoint for the flat Excel template.
    Ensures data integrity through strict validation and lecturer existence checks.
    """
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The extraction pipeline currently only supports Excel files (.xlsx, .xls)."
        )

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # 1. Clean column names to avoid trailing space issues
        df.columns = df.columns.astype(str).str.strip().str.title()

        # 2. Strict Column Validation
        required_cols = ['Date', 'Day', 'Start Time', 'End Time', 'Module Code', 'Module Name', 'Lecturer', 'Location']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid template format. Missing required columns: {', '.join(missing_cols)}. Please use the Standard Template."
            )

        validation_errors = []

        # Check each row for valid mapping
        for index, row in df.iterrows():
            # Skip validation if critical fields are missing (Extraction loop will skip these later)
            if pd.isna(row['Module Code']) or pd.isna(row['Lecturer']):
                continue
                
            raw_lec_name = str(row['Lecturer']).strip()
            mod_code = str(row['Module Code']).strip().upper()

            # Handle TBA explicitly
            if raw_lec_name.upper() == "TBA":
                continue

            # Check 1: Is Lecturer in the system? (Bulletproof Case-Insensitive Query)
            db_lecturer = db.query(Lecturer).filter(
                func.lower(func.trim(Lecturer.name)) == raw_lec_name.lower()
            ).first()

            if not db_lecturer:
                err = f"Lecturer '{raw_lec_name}' (Row {index+2}) is not registered in the system."
                if err not in validation_errors:
                    validation_errors.append(err)
                continue
            
            # Check 2: Is Lecturer assigned to this module?
            # Check the comma-separated assigned_subjects field
            assigned_list = []
            if db_lecturer.assigned_subjects:
                # Assuming comma-separated: "PUSL2022, PUSL2021"
                assigned_list = [s.strip().upper() for s in db_lecturer.assigned_subjects.split(",")]

            if mod_code not in assigned_list:
                err = f"Validation Error (Row {index+2}): '{db_lecturer.name}' is not officially assigned to teach '{mod_code}'."
                if err not in validation_errors:
                    validation_errors.append(err)

        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail={"message": "Validation Failed", "errors": validation_errors}
            )

        # 4. Extract Data
        extracted_data = []
        for _, row in df.iterrows():
            # Skip completely empty rows or rows missing heart data
            if pd.isna(row['Module Code']) or pd.isna(row['Date']):
                continue
                
            # Handle Pandas datetime objects gracefully for the 'Date' column
            date_val = str(row['Date']).split(' ')[0] if pd.notna(row['Date']) else ""
            
            # Auto-resolve degree from database using module code
            mod_code = str(row['Module Code']).strip().upper()
            db_module = db.query(Module).filter(Module.module_code == mod_code).first()
            resolved_degree = db_module.degree if db_module else "Unknown"

            extracted_data.append({
                "date": date_val,
                "day": str(row['Day']).strip(),
                "time": f"{str(row['Start Time']).strip()} - {str(row['End Time']).strip()}",
                "module_code": mod_code,
                "module": str(row['Module Name']).strip(),
                "lecturer": str(row['Lecturer']).strip(),
                "location": str(row['Location']).strip(),
                "faculty": faculty,
                "department": department,
                "batch": batch,
                "semester": semester
            })

        return {
            "status": "success",
            "message": "Timetable extracted successfully",
            "total_records": len(extracted_data),
            "full_data": extracted_data # Return everything for final sync
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_timetable(
    batch_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Parses a 2D Matrix Timetable (Excel/CSV) and inserts it into the DB.
    Expects Days/Dates on X-axis (headers) and Time on Y-axis (first column).
    """
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .csv, .xlsx, .xls are supported."
        )

    try:
        contents = await file.read()
        
        # Parse into Pandas DataFrame
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # Clean dataframe: drop completely empty rows and columns
        df.dropna(how='all', inplace=True)
        df.dropna(axis=1, how='all', inplace=True)
        
        if df.empty or len(df.columns) < 2:
            raise ValueError("The uploaded file does not contain a valid matrix grid.")

        # Identify the Time column (usually the very first column in a 2D matrix timetable)
        time_col_name = df.columns[0]
        
        # The remaining columns represent Dates or Days (e.g., "Monday", "2024-03-25")
        date_columns = df.columns[1:]
        
        entries_to_insert = []
        
        # Iterate over the grid
        for idx, row in df.iterrows():
            time_str = str(row[time_col_name]).strip()
            if not time_str or time_str.lower() == 'nan':
                continue
                
            # Attempt to split "09:00 - 10:00" into start and end time
            parts = [p.strip() for p in time_str.split('-')]
            if len(parts) == 2:
                start_time, end_time = parts[0], parts[1]
            else:
                # If cannot split, fallback to treating the whole string as start_time
                start_time = time_str
                end_time = ""  # We can't definitively know end_time in this case
                
            for date_col in date_columns:
                cell_val = str(row[date_col]).strip()
                if not cell_val or cell_val.lower() == 'nan':
                    continue # Empty cell means no class at this time/date
                    
                # We found a module for this day and time!
                entries_to_insert.append(
                    Timetable(
                        batch_id=batch_id,
                        module_code=cell_val,
                        date=str(date_col).strip(),
                        start_time=start_time,
                        end_time=end_time
                    )
                )
                
        if not entries_to_insert:
            raise ValueError("Could not find any valid classes in the provided matrix.")

        # Batch insert into Database
        db.add_all(entries_to_insert)
        db.commit()
        
        log_audit_action(db, "Timetable Upload", f"Uploaded timetable for batch {batch_id} with {len(entries_to_insert)} entries.")
        
        return {
            "message": "Timetable processed and saved successfully.",
            "entries_added": len(entries_to_insert)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse timetable: {str(e)}"
        )

class TimetableRecord(BaseModel):
    date: str
    day: str
    time: str
    module_code: str
    module_name: str = ""
    lecturer: str = ""
    location: str = ""
    batch: str = ""
    model_config = {"extra": "ignore"}

class SyncPayload(BaseModel):
    batch_id: str
    faculty: str
    department: str
    semester: str
    file_name: str
    records: List[TimetableRecord]

@router.post("/sync")
async def sync_timetable(payload: SyncPayload, db: Session = Depends(get_db)):
    """
    Persists reviewed timetable records into the database.
    Splits the 'time' range into start_time and end_time.
    """
    try:
        # Check if timetable already exists for this batch and semester to prevent duplicates
        existing_record = db.query(Timetable).filter(
            Timetable.batch_id == payload.batch_id,
            Timetable.semester == payload.semester
        ).first()

        if existing_record:
            raise HTTPException(
                status_code=400,
                detail=f"Batch '{payload.batch_id}' ({payload.semester}) already exists. Delete the old one first."
            )

        # Transactional insert
        for record in payload.records:
            # Split "09:00 AM - 11:00 AM" or "09:00 - 11:00"
            time_parts = [p.strip() for p in record.time.split("-")]
            start_t = time_parts[0] if len(time_parts) > 0 else record.time
            end_t = time_parts[1] if len(time_parts) > 1 else ""

            new_entry = Timetable(
                batch_id=payload.batch_id,
                faculty=payload.faculty,
                department=payload.department,
                semester=payload.semester,
                file_name=payload.file_name,
                module_code=record.module_code,
                module_name=record.module_name,
                date=record.date,
                start_time=start_t,
                end_time=end_t,
                lecturer=record.lecturer,
                location=record.location
            )
            db.add(new_entry)
        
        db.commit()
        log_audit_action(db, "System Operations", f"Synced {len(payload.records)} records for batch {payload.batch_id} (File: {payload.file_name})")
        
        return {"status": "success", "message": f"Successfully synced {len(payload.records)} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.get("/recent")
async def get_recent_uploads(db: Session = Depends(get_db)):
    """
    Bulletproof retrieval of unique batches. 
    Groups uniquely in Python to avoid SQLAlchemy/DB-dialect serialization and grouping oddities.
    """
    try:
        # 1. Simple, safe query: Get all records ordered by newest first
        records = db.query(Timetable.batch_id, Timetable.created_at, Timetable.file_name).order_by(Timetable.created_at.desc()).all()

        # 2. Group uniquely in Python
        seen_batches = set()
        recent_uploads = []

        for row in records:
            if row.batch_id not in seen_batches:
                seen_batches.add(row.batch_id)
                
                # 3. Bulletproof string conversion
                safe_date = row.created_at.strftime("%b %d, %Y") if hasattr(row.created_at, 'strftime') else str(row.created_at)
                
                recent_uploads.append({
                    "id": row.batch_id,
                    "name": row.file_name or f"Batch_{row.batch_id}_Schedule.xlsx",
                    "batch": row.batch_id,
                    "date": safe_date,
                    "status": "Success"
                })

        return recent_uploads
    
    except Exception as e:
        print(f"RECENT UPLOADS ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch recent uploads: {str(e)}")

@router.get("/batch/{batch_id}")
async def get_timetable_by_batch(batch_id: str, db: Session = Depends(get_db)):
    """
    Fetches all timetable records for a specific batch.
    Used by the frontend View Modal.
    """
    try:
        # Fetch all records for the given batch_id, ordered by date and time
        records = db.query(Timetable).filter(
            Timetable.batch_id == batch_id
        ).order_by(Timetable.date.asc(), Timetable.start_time.asc()).all()
        
        if not records:
            raise HTTPException(status_code=404, detail=f"No records found for batch {batch_id}")
            
        # Serialize the records
        formatted_records = []
        for rec in records:
            # We use getattr in case these columns are newly added but might be null in old records
            formatted_records.append({
                "id": rec.id,
                "module_code": rec.module_code,
                "module_name": getattr(rec, 'module_name', rec.module_code), 
                "date": rec.date,
                "start_time": rec.start_time,
                "end_time": rec.end_time,
                "lecturer": rec.lecturer,
                "faculty": rec.faculty,
                "department": rec.department,
                "semester": rec.semester
            })
            
        return formatted_records
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"VIEW BATCH ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch records: {str(e)}")

@router.delete("/batch/{batch_id}")
async def delete_timetable_batch(batch_id: str, db: Session = Depends(get_db)):
    """
    Deletes all timetable records for a specific academic batch.
    """
    try:
        deleted_count = db.query(Timetable).filter(Timetable.batch_id == batch_id).delete()
        db.commit()
        
        log_audit_action(db, "System Operations", f"Deleted timetable batch {batch_id} ({deleted_count} records purged)")
        
        return {"status": "success", "message": f"Deleted {deleted_count} records for batch {batch_id}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
@router.post("/{session_id}/start")
async def start_timetable_session(session_id: int, db: Session = Depends(get_db)):
    """Sets a timetable session as active/live."""
    session = db.query(Timetable).filter(Timetable.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_live = True
    db.commit()
    return {"status": "success", "message": f"Session {session_id} is now LIVE."}

@router.post("/{session_id}/stop")
async def stop_timetable_session(session_id: int, db: Session = Depends(get_db)):
    """Ends a live timetable session."""
    session = db.query(Timetable).filter(Timetable.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_live = False
    db.commit()
    return {"status": "success", "message": f"Session {session_id} is now CLOSED."}
