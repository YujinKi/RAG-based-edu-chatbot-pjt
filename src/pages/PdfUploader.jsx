import axios from "axios";

// ✅ PDF 업로드 함수 (공용)
export async function uploadPdfToServer(file) {
  const API_BASE = "https://ilse-tribeless-hilaria.ngrok-free.dev";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data; // { status: "success", questions: [...] }
  } catch (err) {
    console.error("PDF 업로드 실패:", err);
    return { status: "error", message: "서버 연결 실패" };
  }
}
