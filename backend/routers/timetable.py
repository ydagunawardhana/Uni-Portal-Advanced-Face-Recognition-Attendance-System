import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, File
from sqlalchemy.orm import Session
import pandas as pd
from database import get_db
from models import Timetable
from utils.audit_logger import log_audit_action

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

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
