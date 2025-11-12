"""
PDF Upload Quiz Generation Routes
PDF 파일 업로드 및 Gemini API 기반 고품질 퀴즈 생성 엔드포인트
"""

import os
import json
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from services.pdf_service import get_pdf_loader
from services.quiz_service import get_quiz_service
from config.settings import UPLOAD_DIR, MAX_FILE_SIZE, GEMINI_API_KEY
import google.generativeai as genai


router = APIRouter(prefix="/api/quiz", tags=["Quiz Generation"])


# Request/Response 모델
class GenerateQuizRequest(BaseModel):
    num_questions: Optional[int] = 5
    difficulty: Optional[str] = "medium"  # easy, medium, hard
    question_type: Optional[str] = "multiple_choice"  # multiple_choice, true_false, fill_blank


# uploads 디렉토리가 없으면 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Gemini API 설정
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


@router.post("/upload-and-generate")
async def upload_pdf_and_generate_quiz(
    file: UploadFile = File(...),
    num_questions: int = Form(5),
    difficulty: str = Form("medium"),
    question_type: str = Form("multiple_choice")
):
    """
    PDF 파일 업로드 및 Gemini API를 사용한 고품질 퀴즈 생성

    Request:
    - file: PDF 파일 (multipart/form-data)
    - num_questions: 생성할 문제 수 (기본: 5)
    - difficulty: 난이도 (easy, medium, hard)
    - question_type: 문제 유형 (multiple_choice, true_false, fill_blank)

    Returns:
    - success: 성공 여부
    - questions: 생성된 문제 목록
    - file_name: 파일 이름
    """
    # PDF 파일 확인
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="PDF 파일만 업로드 가능합니다."
        )

    # 파일 크기 확인
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 업로드 가능합니다."
        )

    # 파일을 임시로 저장
    temp_file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # 파일 저장
        with open(temp_file_path, "wb") as f:
            f.write(file_content)

        # PDFLoader로 Gemini API에 업로드
        loader = get_pdf_loader()
        uploaded_file = loader.upload_pdf(temp_file_path, display_name=file.filename)

        # 파일 처리 대기
        processed_file = loader.wait_for_file_processing(uploaded_file)

        # QuizService를 사용하여 퀴즈 생성
        quiz_service = get_quiz_service()
        questions = quiz_service.generate_quiz(
            processed_file,
            num_questions=num_questions,
            difficulty=difficulty,
            question_type=question_type
        )

        # 파일 삭제 (선택사항)
        loader.delete_file(processed_file)

        return {
            "success": True,
            "questions": questions,
            "file_name": file.filename,
            "total_questions": len(questions)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"퀴즈 생성 중 오류 발생: {str(e)}"
        )

    finally:
        # 임시 파일 삭제
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# 퀴즈 생성 로직은 quiz_service.py로 이동됨
# 라우트는 얇은 레이어로 유지


@router.post("/generate-from-uploaded")
async def generate_quiz_from_uploaded_file(request: Dict[str, Any]):
    """
    이미 업로드된 PDF 파일로 Gemini API를 사용한 고품질 퀴즈 생성

    Request body:
    {
        "file_name": "files/abc123",
        "num_questions": 5,
        "difficulty": "medium",
        "question_type": "multiple_choice"
    }

    Returns:
    - success: 성공 여부
    - questions: 생성된 문제 목록
    - file_name: 파일 이름
    """
    file_name = request.get("file_name")
    num_questions = request.get("num_questions", 5)
    difficulty = request.get("difficulty", "medium")
    question_type = request.get("question_type", "multiple_choice")

    if not file_name:
        raise HTTPException(
            status_code=400,
            detail="file_name이 필요합니다."
        )

    try:
        # PDFLoader로 업로드된 파일 찾기
        loader = get_pdf_loader()

        uploaded_file = None
        for file in loader.uploaded_files:
            if file.name == file_name:
                uploaded_file = file
                break

        if uploaded_file is None:
            raise HTTPException(
                status_code=404,
                detail=f"파일을 찾을 수 없습니다: {file_name}"
            )

        # QuizService를 사용하여 퀴즈 생성
        quiz_service = get_quiz_service()
        questions = quiz_service.generate_quiz(
            uploaded_file,
            num_questions=num_questions,
            difficulty=difficulty,
            question_type=question_type
        )

        return {
            "success": True,
            "questions": questions,
            "file_name": uploaded_file.display_name,
            "total_questions": len(questions)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"퀴즈 생성 중 오류 발생: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """퀴즈 생성 서비스 상태 확인"""
    return {
        "status": "ok",
        "service": "Quiz Generation with Gemini API",
        "gemini_configured": bool(GEMINI_API_KEY)
    }
