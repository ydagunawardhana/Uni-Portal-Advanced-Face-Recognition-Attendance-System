import re
from datetime import datetime, timedelta
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, File
from sqlalchemy.orm import Session
import pandas as pd
from database import get_db
from models import Timetable
from utils.audit_logger import log_audit_action

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

# Mapping for weekday offsets
DAY_OFFSET = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6
}

@router.post("/extract")
async def extract_timetable(
    file: UploadFile = File(...),
    start_date: str = Form(...),
    faculty: str = Form(...),
    department: str = Form(...),
    degree: str = Form(...),
    batch: str = Form(...),
    semester: str = Form(...)
):
    """
    Advanced Two-Stage ETL:
    1. Extracts Module Mapping Dictionary (Code -> Name).
    2. Parses Timetable and injects full module names using Regex.
    """
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The extraction pipeline currently only supports Excel files (.xlsx, .xls)."
        )

    try:
        # 0. Parse the start date (CRITICAL FOR DATE CALCULATION IN STAGE 3)
        try:
            base_date = datetime.strptime(start_date, "%Y-%m-%d")
            base_weekday = base_date.weekday()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

        # Load raw data
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), header=None)

        # --- STAGE 1: EXTRACT MODULE & LECTURER MAPPING ---
        module_mapping = {}
        mapping_start_idx = -1
        
        for i in range(min(20, len(df))):
            row_str = [str(x).strip().lower() for x in df.iloc[i].tolist()]
            if "module code" in row_str and "module name" in row_str:
                mapping_start_idx = i
                break

        if mapping_start_idx != -1:
            header_row = [str(x).strip().lower() for x in df.iloc[mapping_start_idx].tolist()]
            try:
                code_col = header_row.index("module code")
                name_col = header_row.index("module name")
                # Find lecturer column gracefully
                lec_col = -1
                for idx, col_name in enumerate(header_row):
                    if "lecturer" in col_name:
                        lec_col = idx
                        break
                
                for i in range(mapping_start_idx + 1, min(mapping_start_idx + 30, len(df))):
                    code = str(df.iloc[i, code_col]).strip()
                    name = str(df.iloc[i, name_col]).strip()
                    lecturer = str(df.iloc[i, lec_col]).strip() if lec_col != -1 else "TBA"

                    if code and code.lower() != 'nan' and name and name.lower() != 'nan':
                        module_mapping[code.upper()] = {
                            "name": name,
                            "lecturer": lecturer if lecturer.lower() != 'nan' else "TBA"
                        }
            except ValueError:
                pass

        # --- STAGE 2: FIND TIMETABLE ANCHOR ('MONDAY') ---
        header_idx = -1
        for i in range(min(60, len(df))):
            row_str_list = df.iloc[i].astype(str).str.lower().tolist()
            if any("monday" in str(val) for val in row_str_list):
                header_idx = i
                break

        if header_idx == -1:
            raise HTTPException(status_code=400, detail="Could not find 'Monday' anchor. Invalid format.")

        # Identify which columns correspond to which days
        day_col_map = {}
        timetable_header_row = df.iloc[header_idx].astype(str).str.lower().str.strip()
        for col_idx, cell_val in enumerate(timetable_header_row):
            for day in DAY_OFFSET.keys():
                if day.lower() in str(cell_val) and day not in day_col_map:
                    day_col_map[day] = col_idx

        # --- STAGE 3: AGGRESSIVE EXTRACT AND MAP DATA ---
        extracted_data = []
        start_row = header_idx + 1 
        last_seen_time = "TBA"

        for i in range(start_row, len(df)):
            row = df.iloc[i]
            
            raw_start = str(row.iloc[0]).strip() if len(row) > 0 else ""
            raw_end = str(row.iloc[1]).strip() if len(row) > 1 else ""
            
            if raw_start.lower() == "nan": raw_start = ""
            if raw_end.lower() == "nan": raw_end = ""

            # Prevent 'Week 1' or purely alphabetic noise from becoming the time slot
            if "week" in raw_start.lower():
                raw_start = ""

            if raw_start:
                time_slot = f"{raw_start} - {raw_end}".strip(" -")
                last_seen_time = time_slot
            else:
                time_slot = last_seen_time

            for day, col_idx in day_col_map.items():
                if col_idx < len(row):
                    raw_module = row.iloc[col_idx]
                    
                    if pd.notna(raw_module):
                        raw_module_str = str(raw_module).strip()
                        
                        if not raw_module_str or raw_module_str.lower() == "nan":
                            continue
                            
                        # ENHANCED DATE SKIP: Catch both '20-Jan-25' AND Pandas auto-formatted '2025-01-20 00:00:00'
                        if re.search(r'\d{1,2}-[a-zA-Z]{3}-\d{2,4}', raw_module_str) or re.search(r'\d{4}-\d{2}-\d{2}', raw_module_str):
                            continue

                        # Extract mapping
                        code_match = re.search(r'[A-Za-z]{4}\d{4}', raw_module_str)
                        final_module_name = raw_module_str
                        final_lecturer = "TBA"
                        
                        if code_match:
                            extracted_code = code_match.group(0).upper()
                            if extracted_code in module_mapping:
                                final_module_name = f"{module_mapping[extracted_code]['name']} ({extracted_code})"
                                final_lecturer = module_mapping[extracted_code]['lecturer']
                        
                        days_to_add = (DAY_OFFSET[day] - base_weekday) % 7
                        actual_date = base_date + timedelta(days=days_to_add)

                        extracted_data.append({
                            "date": actual_date.strftime("%Y-%m-%d"),
                            "day": day,
                            "time": time_slot,
                            "module": final_module_name,
                            "lecturer": final_lecturer,  # Added lecturer to payload
                            "faculty": faculty,
                            "department": department,
                            "degree": degree,
                            "batch": batch,
                            "semester": semester
                        })

        if not extracted_data:
            raise HTTPException(status_code=400, detail="Headers found, but no valid classes extracted.")

        return {
            "status": "success",
            "message": "Timetable extracted with full module mapping",
            "total_records": len(extracted_data),
            "preview_data": extracted_data[:5]
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
