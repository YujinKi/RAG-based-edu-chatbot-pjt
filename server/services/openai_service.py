"""
OpenAI Service
Handles all OpenAI API interactions
"""

from typing import List, Dict, Any
from datetime import datetime
from openai import OpenAI
from fastapi import HTTPException

from config.settings import OPENAI_API_KEY


# Initialize OpenAI client
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None
    print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")


def format_date(date_str: str) -> str:
    """Format date string from yyyymmdd to yyyy년 mm월 dd일"""
    if not date_str or len(date_str) != 8:
        return date_str

    try:
        year = date_str[0:4]
        month = date_str[4:6]
        day = date_str[6:8]
        return f"{year}년 {month}월 {day}일"
    except:
        return date_str


async def generate_study_plan(subject: str, exam_schedule: Dict[str, Any], start_date: str) -> Dict[str, Any]:
    """
    Generate AI-powered study plan based on exam information and start date

    Args:
        subject: Exam subject name
        exam_schedule: Dictionary containing exam schedule information
        start_date: Study start date (YYYY-MM-DD format)

    Returns:
        Dictionary containing study plan and metadata
    """
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="OpenAI service is not available. Please set OPENAI_API_KEY in .env file"
        )

    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required")

    # Format exam schedule information
    schedule_info = ""
    doc_exam_date = ""
    prac_exam_date = ""

    if exam_schedule:
        if exam_schedule.get("docRegStartDt"):
            schedule_info += f"필기시험 원서접수: {format_date(exam_schedule.get('docRegStartDt'))} ~ {format_date(exam_schedule.get('docRegEndDt', ''))}\n"
        if exam_schedule.get("docExamDt"):
            doc_exam_date = exam_schedule.get('docExamDt')
            schedule_info += f"필기시험 일자: {format_date(doc_exam_date)}\n"
        if exam_schedule.get("docPassDt"):
            schedule_info += f"필기시험 합격자 발표: {format_date(exam_schedule.get('docPassDt'))}\n"
        if exam_schedule.get("pracRegStartDt"):
            schedule_info += f"실기시험 원서접수: {format_date(exam_schedule.get('pracRegStartDt'))} ~ {format_date(exam_schedule.get('pracRegEndDt', ''))}\n"
        if exam_schedule.get("pracExamStartDt"):
            prac_exam_date = exam_schedule.get('pracExamStartDt')
            schedule_info += f"실기시험 기간: {format_date(prac_exam_date)} ~ {format_date(exam_schedule.get('pracExamEndDt', ''))}\n"
        if exam_schedule.get("pracPassDt"):
            schedule_info += f"최종 합격자 발표: {format_date(exam_schedule.get('pracPassDt'))}\n"

    # Calculate study period
    study_period_info = ""

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            start_date_kr = start_dt.strftime("%Y년 %m월 %d일")

            # Calculate days until written exam
            if doc_exam_date:
                doc_exam_dt = datetime.strptime(doc_exam_date, "%Y%m%d")
                days_to_doc = (doc_exam_dt - start_dt).days
                study_period_info += f"\n공부 시작일: {start_date_kr}\n"
                study_period_info += f"필기시험까지 남은 기간: {days_to_doc}일\n"

            # Calculate days until practical exam
            if prac_exam_date:
                prac_exam_dt = datetime.strptime(prac_exam_date, "%Y%m%d")
                days_to_prac = (prac_exam_dt - start_dt).days
                study_period_info += f"실기시험까지 남은 기간: {days_to_prac}일\n"

        except Exception as e:
            print(f"Date calculation error: {e}")

    # Create prompt for OpenAI
    prompt = f"""당신은 국가기술자격 시험 전문 학습 컨설턴트입니다.

시험 종목: {subject}

시험 일정:
{schedule_info if schedule_info else "일정 정보가 제공되지 않았습니다."}
{study_period_info}

위 정보를 바탕으로 수험생을 위한 맞춤형 학습 계획을 작성해주세요.

다음 내용을 반드시 포함해주세요:

1. **시험 개요 및 난이도 분석**
   - 이 자격증의 특징과 난이도
   - 합격률 및 준비 기간

2. **필기시험 준비 전략**
   - 주요 과목 및 출제 경향
   - 과목별 학습 방법
   - 추천 교재 및 학습 자료

3. **실기시험 준비 전략**
   - 실기 과제 유형 및 준비 방법
   - 실습 연습 방법
   - 주의사항 및 팁

4. **주차별 상세 학습 계획**
   - 공부 시작일부터 시험일까지 주차별로 구체적인 학습 목표 제시
   - 각 주차별 학습할 내용과 목표
   - 필기시험 D-7, D-3, D-1 등 중요 시점별 학습 전략
   - 실기시험 준비 일정

5. **최종 마무리 전략**
   - 시험 직전 준비사항
   - 시험장 준비물
   - 시험 당일 유의사항

학습 기간을 고려하여 현실적이고 실천 가능한 계획을 제시해주세요.
한국어로 친절하고 구체적으로 작성해주세요."""

    try:
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 국가기술자격 시험 전문 학습 컨설턴트입니다. 수험생들이 효율적으로 시험을 준비할 수 있도록 구체적이고 실용적인 조언을 제공합니다. 주어진 학습 기간에 맞춰 현실적이고 실천 가능한 일정을 제시합니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2500
        )

        study_plan = response.choices[0].message.content

        return {
            "success": True,
            "subject": subject,
            "study_plan": study_plan,
            "exam_schedule": exam_schedule,
            "start_date": start_date
        }

    except Exception as e:
        print(f"OpenAI API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


async def chat_with_ai(messages: List[Dict[str, str]]) -> str:
    """
    Chat with AI assistant

    Args:
        messages: List of message dictionaries with 'role' and 'content'

    Returns:
        AI response message
    """
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="OpenAI service is not available. Please set OPENAI_API_KEY in .env file"
        )

    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")

    try:
        # System message
        system_message = {
            "role": "system",
            "content": """당신은 친절하고 전문적인 학습 도우미 AI입니다.

주요 역할:
- 국가기술자격 시험 준비에 대한 조언 제공
- 학습 계획 수립 도움
- 시험 준비 방법 안내
- 학습 동기 부여 및 격려
- 학습 관련 질문에 대한 친절한 답변

답변 스타일:
- 친근하고 이해하기 쉬운 언어 사용
- 구체적이고 실용적인 조언 제공
- 긍정적이고 격려하는 태도 유지
- 필요시 단계별로 설명
- 이모지를 적절히 활용하여 친근감 표현

한국어로 답변해주세요."""
        }

        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[system_message] + messages,
            temperature=0.8,
            max_tokens=1000
        )

        ai_message = response.choices[0].message.content

        return ai_message

    except Exception as e:
        print(f"OpenAI Chat API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
