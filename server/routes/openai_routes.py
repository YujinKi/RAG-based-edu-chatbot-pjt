"""
OpenAI API Routes
All endpoints for OpenAI integration
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from services.openai_service import generate_study_plan, chat_with_ai

router = APIRouter(prefix="/api/openai", tags=["OpenAI"])


@router.post("/generate-study-plan")
async def generate_study_plan_endpoint(request: Dict[str, Any]):
    """
    Generate AI-powered study plan based on exam information and start date

    Request body:
    {
        "subject": "종목명",
        "exam_schedule": {
            "docRegStartDt": "20240101",
            "docRegEndDt": "20240110",
            "docExamDt": "20240201",
            "pracRegStartDt": "20240301",
            "pracExamStartDt": "20240401"
        },
        "start_date": "2024-01-15"
    }
    """
    subject = request.get("subject", "")
    exam_schedule = request.get("exam_schedule", {})
    start_date = request.get("start_date", "")

    return await generate_study_plan(subject, exam_schedule, start_date)


@router.post("/chat")
async def chat_endpoint(request: Dict[str, Any]):
    """
    Chat with AI assistant

    Request body:
    {
        "messages": [
            {"role": "user", "content": "질문 내용"},
            {"role": "assistant", "content": "응답 내용"}
        ]
    }
    """
    messages = request.get("messages", [])

    ai_message = await chat_with_ai(messages)

    return {
        "success": True,
        "message": ai_message
    }
