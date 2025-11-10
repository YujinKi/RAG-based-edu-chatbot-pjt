"""
OpenAI API Routes
All endpoints for OpenAI integration
"""

from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import Dict, Any, List, Optional
import json

from services.openai_service import generate_study_plan, chat_with_ai, chat_with_ai_and_file

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


@router.post("/chat-with-file")
async def chat_with_file_endpoint(
    file: UploadFile = File(...),
    message: str = Form(""),
    messages: str = Form("[]")
):
    """
    Chat with AI assistant including a file upload

    Form data:
    - file: The uploaded file
    - message: Current user message
    - messages: JSON string of previous messages
    """
    try:
        # Read file content
        file_content = await file.read()

        # Try to decode as UTF-8 text
        try:
            file_text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="파일을 읽을 수 없습니다. 텍스트 파일만 지원됩니다."
            )

        # Check file size (limit to 50KB of text)
        if len(file_text) > 50000:
            file_text = file_text[:50000] + "\n\n... (파일이 너무 길어 일부만 표시됩니다)"

        # Parse previous messages
        try:
            previous_messages = json.loads(messages)
        except:
            previous_messages = []

        # Add current message to history
        if message:
            previous_messages.append({
                "role": "user",
                "content": message
            })
        else:
            previous_messages.append({
                "role": "user",
                "content": "이 파일의 내용을 분석해주세요."
            })

        # Get AI response with file content
        ai_message = await chat_with_ai_and_file(
            previous_messages,
            file_text,
            file.filename
        )

        return {
            "success": True,
            "message": ai_message
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=f"파일 처리 중 오류가 발생했습니다: {str(e)}")
