import React, { useState, useEffect } from 'react';
import './DocumentAnalyzer.css';

function DocumentAnalyzer() {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileUri, setSelectedFileUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PDF 분석 관련
  const [extractedText, setExtractedText] = useState('');
  const [preview, setPreview] = useState('');
  const [structuredContent, setStructuredContent] = useState(null);

  // RAG 관련
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState('');

  // 퀴즈 관련
  const [quiz, setQuiz] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  // 업로드된 파일 목록 로드
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('PDF 파일만 업로드 가능합니다.');
      setFile(null);
    }
  };

  // 파일 업로드
  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/pdf/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      alert('파일 업로드 성공!');
      setFile(null);
      loadUploadedFiles();
    } catch (err) {
      setError('업로드 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  // 전체 텍스트 추출
  const extractFullText = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/pdf/extract-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to extract text');

      const data = await response.json();
      setExtractedText(data.text);
      setActiveTab('text');
    } catch (err) {
      setError('텍스트 추출 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 미리보기 추출
  const extractPreview = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/pdf/extract-preview', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to extract preview');

      const data = await response.json();
      setPreview(data.preview);
      setActiveTab('preview');
    } catch (err) {
      setError('미리보기 추출 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 구조화된 콘텐츠 추출
  const extractStructured = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/pdf/extract-structured', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to extract structured content');

      const data = await response.json();
      setStructuredContent(data.content);
      setActiveTab('structured');
    } catch (err) {
      setError('구조화 추출 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 질문 답변
  const askQuestion = async () => {
    if (!question.trim()) {
      setError('질문을 입력해주세요.');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('먼저 파일을 업로드해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileUris = uploadedFiles.map(f => f.name);

      const response = await fetch('http://localhost:3001/api/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          file_uris: fileUris,
          model_name: 'gemini-2.5-flash'
        })
      });

      if (!response.ok) throw new Error('Failed to get answer');

      const data = await response.json();
      setAnswer(data);
      setQuestion('');
    } catch (err) {
      setError('답변 생성 실패: ' + err.message);
    } finally {
      setLoading(false);
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

  // 모든 파일 삭제
  const clearAllFiles = async () => {
    if (!window.confirm('모든 파일을 삭제하시겠습니까?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/pdf/clear-files', {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to clear files');

      alert('모든 파일이 삭제되었습니다.');
      setUploadedFiles([]);
      setExtractedText('');
      setPreview('');
      setStructuredContent(null);
      setAnswer(null);
      setChatHistory([]);
      setQuiz(null);
    } catch (err) {
      setError('파일 삭제 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>학습 자료 분석</h1>
      <p>PDF 문서를 업로드하고 AI로 분석하세요</p>

      <div className="document-analyzer-container">
        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 업로드
          </button>
          <button
            className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            📄 텍스트 추출
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ 미리보기
          </button>
          <button
            className={`tab-btn ${activeTab === 'structured' ? 'active' : ''}`}
            onClick={() => setActiveTab('structured')}
          >
            📊 구조화
          </button>
          <button
            className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            💬 질문답변
          </button>
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💭 채팅
          </button>
          <button
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            📝 퀴즈
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
          {/* 업로드 탭 */}
          {activeTab === 'upload' && (
            <div className="tab-panel">
              <div className="upload-section">
                <h2>PDF 파일 업로드</h2>
                <div className="file-input-container">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  {file && (
                    <p className="selected-file">선택된 파일: {file.name}</p>
                  )}
                </div>

                <div className="action-buttons">
                  <button
                    onClick={handleUpload}
                    disabled={loading || !file}
                    className="action-btn primary"
                  >
                    {loading ? '업로드 중...' : '업로드'}
                  </button>
                  <button
                    onClick={extractFullText}
                    disabled={loading || !file}
                    className="action-btn"
                  >
                    전체 텍스트 추출
                  </button>
                  <button
                    onClick={extractPreview}
                    disabled={loading || !file}
                    className="action-btn"
                  >
                    미리보기
                  </button>
                  <button
                    onClick={extractStructured}
                    disabled={loading || !file}
                    className="action-btn"
                  >
                    구조화 추출
                  </button>
                </div>

                <div className="uploaded-files-section">
                  <div className="section-header">
                    <h3>업로드된 파일 목록 ({uploadedFiles.length})</h3>
                    {uploadedFiles.length > 0 && (
                      <button
                        onClick={clearAllFiles}
                        className="danger-btn-small"
                      >
                        전체 삭제
                      </button>
                    )}
                  </div>
                  <div className="file-list">
                    {uploadedFiles.map((f, index) => (
                      <div key={index} className="file-item">
                        <span className="file-icon">📄</span>
                        <div className="file-info">
                          <p className="file-name">{f.display_name}</p>
                          <p className="file-meta">{f.state} • {f.uri}</p>
                        </div>
                      </div>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <p className="no-files">업로드된 파일이 없습니다</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 텍스트 추출 탭 */}
          {activeTab === 'text' && (
            <div className="tab-panel">
              <h2>추출된 텍스트</h2>
              {extractedText ? (
                <div className="text-content">
                  <pre>{extractedText}</pre>
                </div>
              ) : (
                <p className="empty-message">텍스트를 추출하려면 업로드 탭에서 파일을 선택하고 "전체 텍스트 추출" 버튼을 클릭하세요.</p>
              )}
            </div>
          )}

          {/* 미리보기 탭 */}
          {activeTab === 'preview' && (
            <div className="tab-panel">
              <h2>문서 미리보기</h2>
              {preview ? (
                <div className="preview-content">
                  <pre>{preview}</pre>
                </div>
              ) : (
                <p className="empty-message">미리보기를 생성하려면 업로드 탭에서 "미리보기" 버튼을 클릭하세요.</p>
              )}
            </div>
          )}

          {/* 구조화 탭 */}
          {activeTab === 'structured' && (
            <div className="tab-panel">
              <h2>구조화된 콘텐츠</h2>
              {structuredContent ? (
                <div className="structured-content">
                  <pre>{JSON.stringify(structuredContent, null, 2)}</pre>
                </div>
              ) : (
                <p className="empty-message">구조화된 콘텐츠를 추출하려면 업로드 탭에서 "구조화 추출" 버튼을 클릭하세요.</p>
              )}
            </div>
          )}

          {/* 질문답변 탭 */}
          {activeTab === 'qa' && (
            <div className="tab-panel">
              <h2>문서 기반 질문답변</h2>
              <div className="qa-section">
                <div className="question-input">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="문서에 대해 질문하세요..."
                    rows={4}
                    className="question-textarea"
                  />
                  <button
                    onClick={askQuestion}
                    disabled={loading || !question.trim()}
                    className="send-btn"
                  >
                    {loading ? '답변 생성 중...' : '질문하기'}
                  </button>
                </div>

                {answer && (
                  <div className="answer-box">
                    <h3>답변</h3>
                    <p>{answer.answer}</p>
                    {answer.sources && answer.sources.length > 0 && (
                      <div className="sources">
                        <p><strong>참조 문서:</strong> {answer.sources.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 채팅 탭 */}
          {activeTab === 'chat' && (
            <div className="tab-panel">
              <h2>문서 기반 채팅</h2>
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
                      <div className="message-content">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <p className="empty-message">대화를 시작하세요!</p>
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
              <h2>문서 기반 퀴즈 생성</h2>
              <div className="quiz-section">
                <div className="quiz-settings">
                  <div className="setting-item">
                    <label>문제 수:</label>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      min="1"
                      max="20"
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
                          <p className="question-text">{q.question_text}</p>
                          <div className="options">
                            {q.options && q.options.map((option, optIndex) => (
                              <div key={optIndex} className="option">
                                {option}
                              </div>
                            ))}
                          </div>
                          <div className="answer-section">
                            <p><strong>정답:</strong> {q.correct_answer}</p>
                            <p><strong>해설:</strong> {q.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentAnalyzer;
