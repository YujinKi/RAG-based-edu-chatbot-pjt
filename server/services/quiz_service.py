"""
Quiz Generation Service
Gemini API를 사용한 고품질 퀴즈 생성 서비스 (통합 버전)
"""

import json
import re
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from fastapi import HTTPException


class QuizService:
    """통합 퀴즈 생성 서비스"""

    def __init__(self):
        """QuizService 초기화"""
        pass

    def _extract_json_from_response(self, response_text: str) -> Any:
        """
        AI 응답에서 JSON 추출 (견고한 파싱)

        Args:
            response_text: AI 응답 텍스트

        Returns:
            파싱된 JSON 객체
        """
        # 1. 마크다운 코드 블록 제거
        text = response_text.strip()

        # ```json ... ``` 또는 ``` ... ``` 패턴 제거
        code_block_pattern = r'```(?:json)?\s*([\s\S]*?)```'
        code_block_match = re.search(code_block_pattern, text)

        if code_block_match:
            text = code_block_match.group(1).strip()

        # 2. JSON 배열 또는 객체 추출
        # JSON 배열 패턴: [ ... ]
        json_array_pattern = r'\[\s*\{[\s\S]*\}\s*\]'
        json_array_match = re.search(json_array_pattern, text)

        if json_array_match:
            json_text = json_array_match.group(0)
        else:
            # JSON 객체 패턴: { ... }
            json_object_pattern = r'\{\s*"[\s\S]*\}\s*'
            json_object_match = re.search(json_object_pattern, text)

            if json_object_match:
                json_text = json_object_match.group(0)
            else:
                # 패턴 매칭 실패 시 원본 텍스트 사용
                json_text = text

        # 3. JSON 파싱
        try:
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 실패: {e}")
            print(f"📄 원본 텍스트 (처음 500자): {response_text[:500]}")
            raise ValueError(f"JSON 파싱 실패: {str(e)}")

    def generate_quiz(
        self,
        file_obj,
        num_questions: int = 5,
        difficulty: str = "medium",
        question_type: str = "multiple_choice",
        model_name: str = "gemini-2.5-flash"
    ) -> List[Dict[str, Any]]:
        """
        문서 기반 퀴즈 생성 (통합 버전)

        Args:
            file_obj: Gemini 파일 객체
            num_questions: 생성할 문제 수
            difficulty: 난이도 (easy, medium, hard)
            question_type: 문제 유형 (multiple_choice, true_false, fill_blank)
            model_name: 사용할 Gemini 모델

        Returns:
            생성된 문제 목록
        """
        try:
            # 난이도별 설명
            difficulty_descriptions = {
                "easy": "기본적인 개념 이해를 확인하는 쉬운 수준",
                "medium": "개념 적용과 이해를 요구하는 중간 수준",
                "hard": "깊은 이해와 응용력을 요구하는 어려운 수준"
            }

            # 문제 유형별 형식 지시사항
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

            # 프롬프트 작성
            prompt = f"""당신은 전문적인 시험 문제 출제자입니다. 제공된 문서를 분석하여 고품질의 학습 문제를 생성해주세요.

**문제 생성 요구사항:**
- 문제 수: {num_questions}개
- 난이도: {difficulty} ({difficulty_descriptions.get(difficulty, '')})
- 문제 유형: {question_type}

**문제 생성 가이드라인:**
1. 문서의 핵심 내용을 정확히 반영하는 문제를 만들어주세요
2. 문맥과 논리를 고려하여 의미 있는 문제를 생성해주세요
3. 객관식의 경우, 오답 선택지는 그럴듯하지만 명확히 틀린 것으로 만들어주세요
4. 모든 문제에 대해 자세한 해설을 포함해주세요
5. 문제는 서로 독립적이고 중복되지 않아야 합니다
6. 난이도에 맞는 문제를 출제해주세요

{format_instruction}

**중요: 반드시 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.**
응답 예시: [{{"question": "...", "options": [...], "answer": "...", "explanation": "..."}}, ...]
"""

            # Gemini 모델 생성
            model = genai.GenerativeModel(model_name)

            # 퀴즈 생성
            print(f"🎯 퀴즈 생성 시작: {num_questions}개 문제, 난이도 {difficulty}")
            response = model.generate_content([file_obj, prompt])

            # JSON 파싱 (견고한 추출)
            questions = self._extract_json_from_response(response.text)

            # 리스트가 아닌 경우 처리
            if isinstance(questions, dict):
                if "questions" in questions:
                    questions = questions["questions"]
                else:
                    questions = [questions]

            print(f"✅ 퀴즈 생성 완료: {len(questions)}개 문제")

            return questions

        except Exception as e:
            print(f"❌ 퀴즈 생성 실패: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate quiz: {str(e)}"
            )


# Global QuizService instance (싱글톤 패턴)
_quiz_service_instance: Optional[QuizService] = None


def get_quiz_service() -> QuizService:
    """
    QuizService 싱글톤 인스턴스 반환

    Returns:
        QuizService 인스턴스
    """
    global _quiz_service_instance

    if _quiz_service_instance is None:
        _quiz_service_instance = QuizService()

    return _quiz_service_instance
