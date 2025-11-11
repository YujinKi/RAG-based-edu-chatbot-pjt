import axios from "axios";

// ✅ PDF 업로드 및 AI 퀴즈 생성 함수
export async function uploadPdfToServer(file, options = {}) {
  const API_BASE = "http://localhost:3001";

  const {
    num_questions = 5,
    difficulty = "medium",
    question_type = "multiple_choice"
  } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("num_questions", num_questions);
  formData.append("difficulty", difficulty);
  formData.append("question_type", question_type);

  try {
    const res = await axios.post(`${API_BASE}/api/quiz/upload-and-generate`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data; // { success: true, questions: [...], file_name: "...", total_questions: 5 }
  } catch (err) {
    console.error("PDF 업로드 실패:", err);
    return { success: false, message: err.response?.data?.detail || "서버 연결 실패" };
  }
}
