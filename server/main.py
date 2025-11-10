"""
FastAPI Server for Q-Net API Proxy and OpenAI Integration
Handles CORS, proxies requests to Q-Net OpenAPI, and provides AI-powered study planning
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import httpx
import xmltodict
import json
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

app = FastAPI(title="Study Helper API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Q-Net API Configuration
QNET_TEST_INFO_API = "http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC"
QNET_QUALIFICATION_API = "http://openapi.q-net.or.kr/api/service/rest/InquiryListNationalQualifcationSVC"
QNET_SERVICE_KEY = "892a0f45b2c4a8b1b0c247d38df541b7d5d3ea40e069481b41424cdd1a77bc54"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None
    print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")


async def make_qnet_request(base_url: str, endpoint: str, params: Dict[str, Any]) -> tuple:
    """Make HTTP request to Q-Net API"""
    from urllib.parse import urlencode

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # Build query params like Node.js URLSearchParams
        query_params = {
            "serviceKey": QNET_SERVICE_KEY,
            **params
        }

        # Build query string using urlencode
        query_string = urlencode(query_params)
        url = f"{base_url}/{endpoint}?{query_string}"

        print(f"🔗 Requesting Q-Net API: {url}")

        try:
            response = await client.get(url)
            print(f"✅ Q-Net API Response: status={response.status_code}, length={len(response.text)}")

            # Check for API errors in XML
            if "resultCode" in response.text:
                if "<resultCode>99</resultCode>" in response.text or "<resultCode>00</resultCode>" not in response.text:
                    print(f"⚠️ Response preview: {response.text[:500]}")

            return response.status_code, response.text
        except Exception as e:
            print(f"❌ Q-Net API Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "services": {
            "testInfo": QNET_TEST_INFO_API,
            "qualification": QNET_QUALIFICATION_API,
            "openai": "enabled" if openai_client else "disabled"
        }
    }


# ============================================
# 시험 일정 조회 APIs (InquiryTestInformationNTQSVC)
# ============================================

@app.get("/api/qnet/pe-list")
async def get_pe_list(implYy: Optional[str] = None, implSeq: Optional[str] = None):
    """기술사 시험 시행일정 조회"""
    params = {}
    if implYy:
        params["implYy"] = implYy
    if implSeq:
        params["implSeq"] = implSeq

    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getPEList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


@app.get("/api/qnet/mc-list")
async def get_mc_list(implYy: Optional[str] = None, implSeq: Optional[str] = None):
    """기능장 시험 시행일정 조회"""
    params = {}
    if implYy:
        params["implYy"] = implYy
    if implSeq:
        params["implSeq"] = implSeq

    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getMCList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


@app.get("/api/qnet/e-list")
async def get_e_list(implYy: Optional[str] = None, implSeq: Optional[str] = None):
    """기사, 산업기사 시험 시행일정 조회"""
    params = {}
    if implYy:
        params["implYy"] = implYy
    if implSeq:
        params["implSeq"] = implSeq

    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getEList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


@app.get("/api/qnet/c-list")
async def get_c_list(implYy: Optional[str] = None, implSeq: Optional[str] = None):
    """기능사 시험 시행일정 조회"""
    params = {}
    if implYy:
        params["implYy"] = implYy
    if implSeq:
        params["implSeq"] = implSeq

    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getCList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


@app.get("/api/qnet/fee-list")
async def get_fee_list(jmCd: str = Query(..., description="종목코드 (필수)")):
    """종목별 응시수수료 조회"""
    params = {"jmCd": jmCd}
    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getFeeList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


@app.get("/api/qnet/jm-list")
async def get_jm_list(jmCd: str = Query(..., description="종목코드 (필수)")):
    """종목별 시행일정 목록 조회"""
    params = {"jmCd": jmCd}
    status_code, data = await make_qnet_request(QNET_TEST_INFO_API, "getJMList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


# ============================================
# 국가기술자격 종목 목록 조회 API
# ============================================

@app.get("/api/qnet/qualification-list")
async def get_qualification_list(gno: Optional[str] = None):
    """국가기술자격 종목 목록 조회"""
    params = {}
    if gno:
        params["gno"] = gno

    status_code, data = await make_qnet_request(QNET_QUALIFICATION_API, "getList", params)
    return Response(content=data, media_type="application/xml", status_code=status_code)


# ============================================
# OpenAI Integration - Study Plan Generation
# ============================================

@app.post("/api/openai/generate-study-plan")
async def generate_study_plan(request: Dict[str, Any]):
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
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="OpenAI service is not available. Please set OPENAI_API_KEY in .env file"
        )

    subject = request.get("subject", "")
    exam_schedule = request.get("exam_schedule", {})
    start_date = request.get("start_date", "")

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
    from datetime import datetime
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


if __name__ == "__main__":
    import uvicorn

    print("""
╔════════════════════════════════════════════════════════╗
║         Study Helper API Server Running                ║
╚════════════════════════════════════════════════════════╝

  Port: 3001

  Services:
  - Q-Net API Proxy (시험 일정, 종목 목록)
  - OpenAI Integration (AI 학습 계획 생성)

  Available endpoints:
  ✅ GET  /api/health

  📅 Q-Net 시험 일정 조회:
  - GET /api/qnet/pe-list         (기술사)
  - GET /api/qnet/mc-list         (기능장)
  - GET /api/qnet/e-list          (기사, 산업기사)
  - GET /api/qnet/c-list          (기능사)
  - GET /api/qnet/fee-list        (종목별 수수료)
  - GET /api/qnet/jm-list         (종목별 일정)

  📋 Q-Net 국가기술자격:
  - GET /api/qnet/qualification-list

  🤖 OpenAI 학습 계획:
  - POST /api/openai/generate-study-plan

  Ready to serve! 🚀
  """)

    uvicorn.run(app, host="0.0.0.0", port=3001)
