// src/Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";
import { uploadPdfToServer } from "./PdfUploader"; // ✅ PDF 업로드 공용 함수 (FastAPI 연동)

function Chatbot() {
  // --------------------- 상태 변수 ---------------------
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "안녕하세요! 학습 도우미 AI입니다 😊\nPDF를 업로드하면 자동으로 문제를 만들어드릴게요!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([{ id: 1, title: "새 대화", active: true }]);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);

  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --------------------- 스크롤 유지 ---------------------
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // --------------------- 헬퍼 함수 ---------------------
  const addBotMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: "assistant", content, timestamp: new Date() },
    ]);
  };

  const addUserMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: "user", content, timestamp: new Date() },
    ]);
  };

  const showNextQuestion = (qObj) => {
    const formatted = `📘 문제 ${currentQuestionIndex + 1}\n${qObj.question}\n\n${qObj.options
      .map((opt, i) => `${i + 1}) ${opt}`)
      .join("\n")}`;
    addBotMessage(formatted);
  };

  // --------------------- 대화 전송 ---------------------
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const message = inputMessage.trim();
    addUserMessage(message);
    setInputMessage("");

    // 퀴즈 모드 중이라면 정답 판별
    if (isQuizMode && quizQuestions.length > 0) {
      handleQuizAnswer(message);
      return;
    }

    // 일반 채팅
    addBotMessage("PDF를 업로드하면 문제를 만들어드릴게요!");
  };

  // --------------------- 파일 업로드 ---------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    addUserMessage(`📎 ${file.name} 업로드`);
    setIsLoading(true);

    const data = await uploadPdfToServer(file); // ✅ FastAPI로 전송
    setIsLoading(false);

    if (data.success && data.questions && data.questions.length > 0) {
      setQuizQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setIsQuizMode(true);
      addBotMessage(`PDF 분석이 완료되었습니다! 총 ${data.total_questions}개의 문제를 생성했습니다. 퀴즈를 시작할게요 😄`);
      showNextQuestion(data.questions[0]);
    } else {
      const errorMsg = data.message || "문제 생성에 실패했습니다";
      addBotMessage(`❌ ${errorMsg}. 다시 시도해주세요.`);
    }

    // 업로드 후 input 초기화
    e.target.value = "";
  };

  // --------------------- 퀴즈 정답 처리 ---------------------
  const handleQuizAnswer = (answerText) => {
    const currentQ = quizQuestions[currentQuestionIndex];
    const correct = currentQ.answer.trim();

    if (answerText.includes(correct) || answerText === correct) {
      addBotMessage("✅ 정답입니다! 잘하셨어요 👏");
    } else {
      addBotMessage(`❌ 오답이에요. 정답은 '${correct}'입니다.`);
    }

    const next = currentQuestionIndex + 1;
    if (next < quizQuestions.length) {
      setCurrentQuestionIndex(next);
      setTimeout(() => showNextQuestion(quizQuestions[next]), 1000);
    } else {
      addBotMessage("🎉 모든 문제를 완료했습니다! 수고하셨어요!");
      setIsQuizMode(false);
    }
  };

  // --------------------- 사이드바 기능 ---------------------
  const handleNewChat = () => {
    setConversations((prev) =>
      prev.map((c) => ({ ...c, active: false })).concat({
        id: prev.length + 1,
        title: "새 대화",
        active: true,
      })
    );
    setMessages([
      {
        id: 1,
        role: "assistant",
        content:
          "새 대화를 시작합니다. PDF를 업로드하면 문제를 만들어드릴게요 😊",
        timestamp: new Date(),
      },
    ]);
    setIsQuizMode(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
  };

  const handleSelectConversation = (convId) => {
    setConversations((prev) =>
      prev.map((c) => ({ ...c, active: c.id === convId }))
    );
    setActiveConversationId(convId);
  };

  return (
    <div className="chatbot-container">
      {/* ---------------- 사이드바 ---------------- */}
      <aside className="chatbot-sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span className="icon">+</span> 새 대화
          </button>
        </div>

        <div className="conversations-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.active ? "active" : ""}`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <span className="conversation-icon">💬</span>
              <span className="conversation-title">{conv.title}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            <span className="user-name">사용자</span>
          </div>
        </div>
      </aside>

      {/* ---------------- 메인 채팅 ---------------- */}
      <main className="chatbot-main">
        <div className="chat-header">
          <h2>학습 도우미 AI</h2>
          <p className="chat-subtitle">PDF 업로드로 퀴즈를 만들어드립니다.</p>
        </div>

        <div className="messages-container" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role === "user" ? "user-message" : "assistant-message"}`}
            >
              <div className="message-avatar">
                {msg.role === "user" ? "👤" : "🤖"}
              </div>
              <div className="message-content">
                <pre className="message-text">{msg.content}</pre>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant-message">
              <div className="message-avatar">🤖</div>
              <div className="message-content typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- 입력창 ---------------- */}
        <div className="input-container">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <div className="input-wrapper">
            {/* 📎 파일 첨부 버튼 */}
            <button
              className="file-upload-button"
              onClick={() => fileInputRef.current.click()}
              title="PDF 업로드"
              disabled={isLoading}
            >
              📎
            </button>

            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하거나 PDF를 첨부하세요..."
              rows="1"
              disabled={isLoading}
            />

            <button className="send-button" onClick={handleSendMessage} disabled={isLoading}>
              🚀
            </button>
          </div>

          <p className="input-hint">
            AI가 생성한 정보는 참고용입니다. 중요한 내용은 반드시 검토하세요.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Chatbot;
