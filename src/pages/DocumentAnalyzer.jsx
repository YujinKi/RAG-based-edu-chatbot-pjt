import React, { useState, useEffect, useRef } from 'react';
import './DocumentAnalyzer.css';
import { uploadPdfToServer } from './PdfUploader';

function DocumentAnalyzer() {
  // 마크다운 텍스트를 HTML로 변환하는 함수
  const renderMarkdown = (text) => {
    if (!text) return '';

    let html = text;

    // Bold 처리 (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic 처리 (*text* or _text_)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // 코드 블록 처리 (```code```)
    html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

    // 인라인 코드 처리 (`code`)
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // 줄바꿈 처리
    html = html.split('\n').map(line => {
      // 헤딩 처리
      if (line.startsWith('### ')) {
        return '<h3>' + line.substring(4) + '</h3>';
      } else if (line.startsWith('## ')) {
        return '<h2>' + line.substring(3) + '</h2>';
      } else if (line.startsWith('# ')) {
        return '<h1>' + line.substring(2) + '</h1>';
      }

      // Bullet point 처리
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return '<li>' + line.trim().substring(2) + '</li>';
      }

      // 숫자 리스트 처리
      const numberMatch = line.trim().match(/^(\d+)\.\s(.+)/);
      if (numberMatch) {
        return '<li>' + numberMatch[2] + '</li>';
      }

      // 일반 줄
      return line.trim() ? '<p>' + line + '</p>' : '<br />';
    }).join('');

    // 리스트 항목들을 ul 태그로 감싸기
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    return html;
  };
  const [activeTab, setActiveTab] = useState('chat');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // RAG 관련
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState('');

  // 퀴즈 관련
  const [quiz, setQuiz] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  // PDF 퀴즈 챗봇 관련
  const [pdfQuizMessages, setPdfQuizMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '안녕하세요! 학습 도우미 AI입니다 😊\nPDF를 업로드하면 자동으로 문제를 만들어드릴게요!',
      timestamp: new Date()
    }
  ]);
  const [pdfQuizInput, setPdfQuizInput] = useState('');
  const [pdfQuizLoading, setPdfQuizLoading] = useState(false);
  const [pdfQuizQuestions, setPdfQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [conversations, setConversations] = useState([{ id: 1, title: '새 대화', active: true }]);
  const [activeConversationId, setActiveConversationId] = useState(1);

  const messagesContainerRef = useRef(null);
  const pdfQuizFileInputRef = useRef(null);

  // 업로드된 파일 목록 로드
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  // PDF 퀴즈 챗봇 메시지 자동 스크롤
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [pdfQuizMessages]);

  // 업로드된 파일 목록 로드
  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/pdf/uploaded-files');
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };


  // 채팅 메시지 전송
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    if (uploadedFiles.length === 0) {
      setError('먼저 파일을 업로드해주세요.');
      return;
    }

    // 대화 ID 생성 (첫 메시지인 경우)
    const convId = conversationId || `conv_${Date.now()}`;
    if (!conversationId) {
      setConversationId(convId);
    }

    setLoading(true);
    setError(null);

    try {
      const fileUris = uploadedFiles.map(f => f.name);

      const response = await fetch('http://localhost:3001/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          file_uris: fileUris,
          conversation_id: convId,
          model_name: 'gemini-2.5-flash'
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      setChatHistory([
        ...chatHistory,
        { role: 'user', content: chatMessage },
        { role: 'assistant', content: data.answer }
      ]);
      setChatMessage('');
    } catch (err) {
      setError('메시지 전송 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 퀴즈 생성
  const generateQuiz = async () => {
    if (uploadedFiles.length === 0) {
      setError('먼저 파일을 업로드해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/rag/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_uri: uploadedFiles[0].name,
          num_questions: numQuestions,
          difficulty: difficulty,
          model_name: 'gemini-2.5-flash'
        })
      });

      if (!response.ok) throw new Error('Failed to generate quiz');

      const data = await response.json();
      setQuiz(data.quiz);
    } catch (err) {
      setError('퀴즈 생성 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF 퀴즈 챗봇 헬퍼 함수
  const addPdfQuizBotMessage = (content) => {
    setPdfQuizMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'assistant', content, timestamp: new Date() }
    ]);
  };

  const addPdfQuizUserMessage = (content) => {
    setPdfQuizMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', content, timestamp: new Date() }
    ]);
  };

  const showNextQuestion = (qObj) => {
    const formatted = `📘 문제 ${currentQuestionIndex + 1}\n${qObj.question}\n\n${qObj.options
      .map((opt, i) => `${i + 1}) ${opt}`)
      .join('\n')}`;
    addPdfQuizBotMessage(formatted);
  };

  // PDF 퀴즈 챗봇 메시지 전송
  const handlePdfQuizSendMessage = async () => {
    if (!pdfQuizInput.trim()) return;
    const message = pdfQuizInput.trim();
    addPdfQuizUserMessage(message);
    setPdfQuizInput('');

    // 퀴즈 모드 중이라면 정답 판별
    if (isQuizMode && pdfQuizQuestions.length > 0) {
      handleQuizAnswer(message);
      return;
    }

    // 일반 채팅
    addPdfQuizBotMessage('PDF를 업로드하면 문제를 만들어드릴게요!');
  };

  // PDF 퀴즈 파일 선택
  const handlePdfQuizFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    addPdfQuizUserMessage(`📎 ${file.name} 업로드`);
    setPdfQuizLoading(true);

    const data = await uploadPdfToServer(file);
    setPdfQuizLoading(false);

    if (data.success && data.questions && data.questions.length > 0) {
      setPdfQuizQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setIsQuizMode(true);
      addPdfQuizBotMessage(`PDF 분석이 완료되었습니다! 총 ${data.total_questions}개의 문제를 생성했습니다. 퀴즈를 시작할게요 😄`);
      showNextQuestion(data.questions[0]);
    } else {
      const errorMsg = data.message || '문제 생성에 실패했습니다';
      addPdfQuizBotMessage(`❌ ${errorMsg}. 다시 시도해주세요.`);
    }

    // 업로드 후 input 초기화
    e.target.value = '';
  };

  // 퀴즈 정답 처리
  const handleQuizAnswer = (answerText) => {
    const currentQ = pdfQuizQuestions[currentQuestionIndex];
    const correct = currentQ.answer.trim();

    if (answerText.includes(correct) || answerText === correct) {
      addPdfQuizBotMessage('✅ 정답입니다! 잘하셨어요 👏');
    } else {
      addPdfQuizBotMessage(`❌ 오답이에요. 정답은 '${correct}'입니다.`);
    }

    const next = currentQuestionIndex + 1;
    if (next < pdfQuizQuestions.length) {
      setCurrentQuestionIndex(next);
      setTimeout(() => showNextQuestion(pdfQuizQuestions[next]), 1000);
    } else {
      addPdfQuizBotMessage('🎉 모든 문제를 완료했습니다! 수고하셨어요!');
      setIsQuizMode(false);
    }
  };

  // 새 대화 시작
  const handleNewChat = () => {
    setConversations((prev) =>
      prev.map((c) => ({ ...c, active: false })).concat({
        id: prev.length + 1,
        title: '새 대화',
        active: true
      })
    );
    setPdfQuizMessages([
      {
        id: 1,
        role: 'assistant',
        content: '새 대화를 시작합니다. PDF를 업로드하면 문제를 만들어드릴게요 😊',
        timestamp: new Date()
      }
    ]);
    setIsQuizMode(false);
    setPdfQuizQuestions([]);
    setCurrentQuestionIndex(0);
  };

  const handleSelectConversation = (convId) => {
    setConversations((prev) =>
      prev.map((c) => ({ ...c, active: c.id === convId }))
    );
    setActiveConversationId(convId);
  };

  return (
    <div className="page-container">
      <h1>학습 자료 분석</h1>
      <p>업로드된 PDF 문서를 기반으로 AI 분석, 질문답변, 퀴즈를 이용하세요</p>

      <div className="document-analyzer-container">
        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💭 Q&A 챗봇
          </button>
          <button
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            📝 퀴즈
          </button>
          <button
            className={`tab-btn ${activeTab === 'pdf-quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf-quiz')}
          >
            🤖 PDF 퀴즈 챗봇
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* 탭 콘텐츠 */}
        <div className="tab-content">
          {/* AI 챗봇 탭 */}
          {activeTab === 'chat' && (
            <div className="tab-panel">
              <h2>Q&A 챗봇</h2>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '-10px', marginBottom: '20px' }}>
                업로드한 문서를 기반으로 AI에게 자유롭게 질문해보세요
              </p>
              <div className="chat-section">
                <div className="chat-history">
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`chat-message ${msg.role}`}
                    >
                      <div className="message-label">
                        {msg.role === 'user' ? '👤 사용자' : '🤖 AI'}
                      </div>
                      <div
                        className="message-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <p className="empty-message">
                      AI 챗봇과 대화를 시작하세요!<br />
                      ex) 문서를 요약해주세요 혹은 ~에 대해 설명해주세요
                    </p>
                  )}
                </div>

                <div className="chat-input">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    rows={3}
                    className="chat-textarea"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={loading || !chatMessage.trim()}
                    className="send-btn"
                  >
                    {loading ? '전송 중...' : '전송'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 퀴즈 탭 */}
          {activeTab === 'quiz' && (
            <div className="tab-panel">
              <h2>문제 풀기</h2>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '-10px', marginBottom: '20px' }}>
                문서 내용을 기반으로 객관식 문제를 생성합니다. <br />
                문제 수와 난이도를 선택해주세요. 문제 수는 최대 10개까지 생성할 수 있습니다.
              </p>
              <div className="quiz-section">
                <div className="quiz-settings">
                  <div className="setting-item">
                    <label>문제 수:</label>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      min="1"
                      max="10"
                      className="number-input"
                    />
                  </div>
                  <div className="setting-item">
                    <label>난이도:</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="difficulty-select"
                    >
                      <option value="easy">쉬움</option>
                      <option value="medium">보통</option>
                      <option value="hard">어려움</option>
                    </select>
                  </div>
                  <button
                    onClick={generateQuiz}
                    disabled={loading || uploadedFiles.length === 0}
                    className="generate-btn"
                  >
                    {loading ? '퀴즈 생성 중...' : '퀴즈 생성'}
                  </button>
                </div>

                {quiz && (
                  <div className="quiz-result">
                    <h3>{quiz.quiz_title}</h3>
                    <p className="quiz-meta">
                      문제 수: {quiz.total_questions} | 난이도: {quiz.difficulty}
                    </p>
                    <div className="questions-list">
                      {quiz.questions && quiz.questions.map((q, index) => (
                        <div key={index} className="question-card">
                          <h4>문제 {q.question_number}</h4>
                          <div
                            className="question-text"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }}
                          />
                          <div className="options">
                            {q.options && q.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="option"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(option) }}
                              />
                            ))}
                          </div>
                          <div className="answer-section">
                            <p>
                              <strong>정답:</strong>{' '}
                              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(q.correct_answer) }} />
                            </p>
                            <p>
                              <strong>해설:</strong>{' '}
                              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(q.explanation) }} />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PDF 퀴즈 챗봇 탭 */}
          {activeTab === 'pdf-quiz' && (
            <div className="tab-panel pdf-quiz-chatbot">
              <div className="chatbot-container">
                {/* 사이드바 */}
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
                        className={`conversation-item ${conv.active ? 'active' : ''}`}
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

                {/* 메인 채팅 */}
                <main className="chatbot-main">
                  <div className="chat-header">
                    <h2>PDF 퀴즈 챗봇</h2>
                    <p className="chat-subtitle">PDF 업로드로 퀴즈를 만들어드립니다.</p>
                  </div>

                  <div className="messages-container" ref={messagesContainerRef}>
                    {pdfQuizMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                      >
                        <div className="message-avatar">
                          {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="message-content">
                          <pre className="message-text">{msg.content}</pre>
                        </div>
                      </div>
                    ))}

                    {pdfQuizLoading && (
                      <div className="message assistant-message">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 입력창 */}
                  <div className="input-container">
                    <input
                      ref={pdfQuizFileInputRef}
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={handlePdfQuizFileSelect}
                    />

                    <div className="input-wrapper">
                      {/* 파일 첨부 버튼 */}
                      <button
                        className="file-upload-button"
                        onClick={() => pdfQuizFileInputRef.current.click()}
                        title="PDF 업로드"
                        disabled={pdfQuizLoading}
                      >
                        📎
                      </button>

                      <textarea
                        value={pdfQuizInput}
                        onChange={(e) => setPdfQuizInput(e.target.value)}
                        placeholder="메시지를 입력하거나 PDF를 첨부하세요..."
                        rows="1"
                        disabled={pdfQuizLoading}
                      />

                      <button
                        className="send-button"
                        onClick={handlePdfQuizSendMessage}
                        disabled={pdfQuizLoading}
                      >
                        🚀
                      </button>
                    </div>

                    <p className="input-hint">
                      AI가 생성한 정보는 참고용입니다. 중요한 내용은 반드시 검토하세요.
                    </p>
                  </div>
                </main>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentAnalyzer;
