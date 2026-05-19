from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.models import User
from app.schemas import ChatRequest, ChatResponse
from app.auth import require_admin
from app.services.ai_service import question_to_sql, format_answer, analyze_student_risk

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Natural language → SQL → friendly answer."""
    if not data.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    try:
        sql = await question_to_sql(data.question, user.school_id)

        # Execute the AI-generated SQL safely
        result = await db.execute(text(sql))
        rows = [dict(r._mapping) for r in result.fetchall()]

        answer = await format_answer(data.question, rows, sql)
        return ChatResponse(answer=answer, sql_used=sql, row_count=len(rows))

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"AI service error: {str(e)}")


@router.get("/risk-analysis")
async def risk_analysis(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """AI-generated analysis of at-risk students."""
    analysis = await analyze_student_risk(user.school_id, db)
    return {"analysis": analysis}
