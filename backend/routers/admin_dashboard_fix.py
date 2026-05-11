@router.get(
    "/dashboard-stats",
    response_model=DashboardStats,
    summary="Live dashboard stats for the Admin home page",
)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns live counts, today's attendance percentage, and trend/dept data.
    """
    total_students  = db.query(models.Student).count()
    total_lecturers = db.query(models.User).filter(
        models.User.role == "Lecturer"
    ).count()

    start, now = _today_range()
    students_today = (
        db.query(models.AttendanceLog.student_id)
        .filter(
            models.AttendanceLog.timestamp >= start,
            models.AttendanceLog.timestamp <= now,
            models.AttendanceLog.status == "entered",
        )
        .distinct()
        .count()
    )

    pct = (
        round((students_today / total_students) * 100, 1)
        if total_students > 0 else 0.0
    )

    # 1. Real pending re-train requests from student records
    pending_retrains = db.query(models.Student).filter(models.Student.retrain_requested == True).count()
    
    # 2. Students with < 80% attendance (Placeholder for now)
    low_attendance = 0 
    
    # 3. Active sessions today (Placeholder for now)
    active_modules = 0

    # 4. Pending Manual Attendance Requests
    pending_manual = db.query(models.CorrectionRequest).filter(models.CorrectionRequest.status == "Pending").count()

    # 5. Weekly Trend (Last 7 Days)
    weekly_trend = []
    from datetime import timedelta
    from sqlalchemy import func
    for i in range(6, -1, -1):
        target_date = (datetime.now() - timedelta(days=i)).date()
        day_records = db.query(models.AttendanceRecord).join(
            models.ClassSession, models.AttendanceRecord.session_id == models.ClassSession.id
        ).filter(
            func.date(models.ClassSession.start_time) == target_date
        ).all()
        
        if not day_records:
            val = 0
        else:
            present_count = len([r for r in day_records if r.status == "Present"])
            val = round((present_count / len(day_records)) * 100, 1)
        
        weekly_trend.append({
            "name": target_date.strftime("%a"),
            "attendance": val
        })

    # 6. Department Stats
    dept_stats = []
    departments = db.query(models.Student.department).distinct().all()
    for (dept_name,) in departments:
        if not dept_name: continue
        
        records = db.query(models.AttendanceRecord).join(
            models.Student, models.AttendanceRecord.student_id == models.Student.id
        ).filter(
            models.Student.department == dept_name
        ).all()
        
        if not records:
            avg_pct = 0
        else:
            present = len([r for r in records if r.status == "Present"])
            avg_pct = round((present / len(records)) * 100, 1)
            
        dept_stats.append({
            "name": dept_name,
            "attendance": avg_pct
        })

    return DashboardStats(
        total_students=total_students,
        total_lecturers=total_lecturers,
        todays_attendance_pct=pct,
        pending_manual_requests=pending_manual,
        pending_retrains=pending_retrains,
        low_attendance_alerts=low_attendance,
        active_modules_today=active_modules,
        weeklyTrend=weekly_trend,
        departmentStats=dept_stats
    )
