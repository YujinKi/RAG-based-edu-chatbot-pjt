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

        # Gemini API를 사용하여 퀴즈 생성
        questions = await generate_quiz_with_gemini(
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


async def generate_quiz_with_gemini(
    pdf_file,
    num_questions: int = 5,
    difficulty: str = "medium",
    question_type: str = "multiple_choice"
) -> List[Dict[str, Any]]:
    """
    Gemini API를 사용하여 PDF에서 고품질 퀴즈 생성

    Args:
        pdf_file: Gemini에 업로드된 PDF 파일 객체
        num_questions: 생성할 문제 수
        difficulty: 난이도 (easy, medium, hard)
        question_type: 문제 유형 (multiple_choice, true_false, fill_blank)

    Returns:
        생성된 문제 목록
    """
    # 난이도별 설명
    difficulty_descriptions = {
        "easy": "기본적인 개념 이해를 확인하는 쉬운 수준",
        "medium": "개념 적용과 이해를 요구하는 중간 수준",
        "hard": "깊은 이해와 응용력을 요구하는 어려운 수준"
    }

    # 문제 유형별 프롬프트
    if question_type == "multiple_choice":
        format_instruction = """
각 문제는 다음 JSON 형식으로 작성해주세요:
{
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": "정답",
    "explanation": "해설"
}
"""
    elif question_type == "true_false":
        format_instruction = """
각 문제는 다음 JSON 형식으로 작성해주세요:
{
    "question": "문제 내용 (참/거짓 판단)",
    "answer": "참" 또는 "거짓",
    "explanation": "해설"
}
"""
    elif question_type == "fill_blank":
        format_instruction = """
각 문제는 다음 JSON 형식으로 작성해주세요:
{
    "question": "빈칸이 포함된 문제 내용 (_____를 사용)",
    "answer": "정답",
    "explanation": "해설"
}
"""
    else:
        format_instruction = """
각 문제는 다음 JSON 형식으로 작성해주세요:
{
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": "정답",
    "explanation": "해설"
}
"""

    # Gemini 프롬프트 작성
    prompt = f"""
당신은 전문적인 시험 문제 출제자입니다. 제공된 PDF 문서를 분석하여 고품질의 학습 문제를 생성해주세요.

**문제 생성 요구사항:**
- 문제 수: {num_questions}개
- 난이도: {difficulty} ({difficulty_descriptions.get(difficulty, '')})
- 문제 유형: {question_type}

**문제 생성 가이드라인:**
1. 문서의 핵심 내용을 정확히 반영하는 문제를 만들어주세요
2. 문맥과 논리를 고려하여 의미 있는 문제를 생성해주세요
3. 오답 선택지는 그럴듯하지만 명확히 틀린 것으로 만들어주세요
4. 모든 문제에 대해 자세한 해설을 포함해주세요
5. 문제는 서로 독립적이고 중복되지 않아야 합니다

{format_instruction}

**중요: 반드시 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.**
응답 예시: [{{ "question": "...", "options": [...], "answer": "...", "explanation": "..." }}, ...]
"""

    try:
        # Gemini 모델 초기화
        model = genai.GenerativeModel("gemini-2.5-flash")

        # PDF와 함께 프롬프트 전송
        response = model.generate_content([pdf_file, prompt])

        # 응답 텍스트 추출
        response_text = response.text.strip()

        print(f"🤖 Gemini 응답 받음 (길이: {len(response_text)})")
        print(f"📝 응답 미리보기: {response_text[:200]}...")

        # JSON 파싱 시도
        # 마크다운 코드 블록 제거
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # JSON 파싱
        questions = json.loads(response_text)

        if not isinstance(questions, list):
            raise ValueError("응답이 리스트 형식이 아닙니다")

        return questions[:num_questions]  # 요청한 문제 수만큼 반환

    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {str(e)}")
        print(f"📄 전체 응답:\n{response_text}")
        raise Exception(f"Gemini 응답을 파싱하는 중 오류 발생: {str(e)}\n응답 내용: {response_text[:500]}")
    except Exception as e:
        print(f"❌ 퀴즈 생성 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"퀴즈 생성 실패: {str(e)}")


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

        # Gemini API를 사용하여 퀴즈 생성
        questions = await generate_quiz_with_gemini(
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
