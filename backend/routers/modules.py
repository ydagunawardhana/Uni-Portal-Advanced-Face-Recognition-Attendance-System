from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from typing import List, Optional
from database import get_db
import models
import schemas
from utils.audit_logger import log_audit_action

# Admin Router for CRUD operations
router = APIRouter(prefix="/api/admin/modules", tags=["Admin Module Management"])

# Public Router for dropdowns (legacy support for frontend)
public_router = APIRouter(prefix="/api/modules", tags=["Modules Public"])

@router.get("/", response_model=List[schemas.ModuleOut])
@public_router.get("/", response_model=List[schemas.ModuleOut])
async def get_modules(
    department: Optional[str] = Query(None),
    faculty: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves all modules, with optional filtering by department or faculty.
    Used for both Admin management and populating frontend dropdowns.
    """
    query = db.query(models.Module)
    
    if department:
        query = query.filter(models.Module.department == department)
    if faculty:
        query = query.filter(models.Module.faculty == faculty)
        
    return query.all()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_modules(
    modules: List[schemas.ModuleCreate],
    db: Session = Depends(get_db)
):
    """
    Adds multiple academic modules to the database in a single transaction.
    Ensures module_code uniqueness for each entry in the batch.
    """
    new_modules = []
    for mod in modules:
        # Check if module code already exists (case-insensitive)
        db_module = db.query(models.Module).filter(
            models.Module.module_code == mod.module_code.strip().upper()
        ).first()
        
        if db_module:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Module with code '{mod.module_code}' already exists in the system."
            )
        
        new_module = models.Module(
            module_code=mod.module_code.strip().upper(),
            module_name=mod.module_name,
            faculty=mod.faculty,
            department=mod.department,
            level=mod.level,
            degree=mod.degree
        )
        new_modules.append(new_module)
    
    db.add_all(new_modules)
    db.commit()
    
    # Audit trail for the bulk action
    codes = [m.module_code for m in new_modules]
    log_audit_action(db, "Module Management", f"Bulk created {len(new_modules)} modules: {', '.join(codes[:5])}...")
    
    return {
        "status": "success",
        "message": f"Successfully registered {len(new_modules)} academic modules.",
        "added_count": len(new_modules)
    }

@router.put("/{module_id}", response_model=schemas.ModuleOut)
async def update_module(
    module_id: int,
    module_data: schemas.ModuleUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates an existing academic module.
    """
    db_module = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Check uniqueness if module_code is changing
    if module_data.module_code and module_data.module_code.upper() != db_module.module_code:
        duplicate = db.query(models.Module).filter(
            models.Module.module_code == module_data.module_code.strip().upper()
        ).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="Another module with this code already exists.")

    # Update fields
    update_dict = module_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if key == "module_code":
            setattr(db_module, key, value.strip().upper())
        else:
            setattr(db_module, key, value)

    db.commit()
    db.refresh(db_module)
    
    log_audit_action(db, "Module Management", f"Updated module: {db_module.module_code}")
    
    return db_module

@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: int,
    db: Session = Depends(get_db)
):
    """
    Removes a module from the database.
    """
    db_module = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    log_audit_action(db, "Module Management", f"Deleted module: {db_module.module_code}")
    
    db.delete(db_module)
    db.commit()
    return None
