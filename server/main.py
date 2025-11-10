"""
FastAPI Server for Q-Net API Proxy and OpenAI Integration
Handles CORS, proxies requests to Q-Net OpenAPI, and provides AI-powered study planning
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import QNET_TEST_INFO_API, QNET_QUALIFICATION_API, OPENAI_API_KEY
from routes.qnet_routes import router as qnet_router
from routes.openai_routes import router as openai_router

# Initialize FastAPI app
app = FastAPI(title="Study Helper API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(qnet_router)
app.include_router(openai_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "services": {
            "testInfo": QNET_TEST_INFO_API,
            "qualification": QNET_QUALIFICATION_API,
            "openai": "enabled" if OPENAI_API_KEY else "disabled"
        }
    }


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

  🤖 OpenAI:
  - POST /api/openai/generate-study-plan  (학습 계획 생성)
  - POST /api/openai/chat                 (AI 챗봇)

  Ready to serve! 🚀
  """)

    uvicorn.run(app, host="0.0.0.0", port=3001)
