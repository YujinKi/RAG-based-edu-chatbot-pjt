import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '안녕하세요! 저는 학습 도우미 AI입니다. 국가기술자격 시험 준비나 학습 계획에 대해 무엇이든 물어보세요. 😊',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([
    { id: 1, title: '새 대화', active: true }
  ]);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);

  // 메시지가 추가되면 스크롤을 맨 아래로
  useEffect(() => {
    // 초기 마운트 시에는 스크롤하지 않음
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // 컨테이너 내부만 스크롤 (페이지 전체 스크롤 방지)
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // 새 대화 시작
  const handleNewChat = () => {
    const newConvId = conversations.length + 1;
    setConversations([
      ...conversations.map(conv => ({ ...conv, active: false })),
      { id: newConvId, title: '새 대화', active: true }
    ]);
    setActiveConversationId(newConvId);
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: '안녕하세요! 저는 학습 도우미 AI입니다. 국가기술자격 시험 준비나 학습 계획에 대해 무엇이든 물어보세요. 😊',
        timestamp: new Date()
      }
    ]);
    // 새 대화 시작 시 초기 마운트 플래그 리셋
    isInitialMount.current = true;
  };

  // 대화 선택
  const handleSelectConversation = (convId) => {
    setConversations(conversations.map(conv => ({
      ...conv,
      active: conv.id === convId
    })));
    setActiveConversationId(convId);
    // 실제로는 해당 대화의 메시지를 불러와야 함
  };

  // 파일 선택
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // 파일 제거
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 파일 업로드 버튼 클릭
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedFile) || isLoading) return;

    const messageContent = inputMessage.trim();
    const hasFile = selectedFile !== null;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: hasFile
        ? `${messageContent}${messageContent ? '\n\n' : ''}📎 파일: ${selectedFile.name}`
        : messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    const fileToSend = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);

    // 대화 제목 업데이트 (첫 메시지일 경우)
    if (messages.length === 1) {
      const title = messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : '');
      setConversations(conversations.map(conv =>
        conv.id === activeConversationId ? { ...conv, title: title || '파일 업로드' } : conv
      ));
    }

    try {
      let apiResponse;

      if (fileToSend) {
        // 파일이 있는 경우 FormData로 전송
        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('message', messageContent);
        formData.append('messages', JSON.stringify(
          messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ));

        apiResponse = await fetch('http://localhost:3001/api/openai/chat-with-file', {
          method: 'POST',
          body: formData
        });
      } else {
        // 일반 메시지 전송
        apiResponse = await fetch('http://localhost:3001/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: messageContent
              }
            ]
          })
        });
      }

      if (!apiResponse.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await apiResponse.json();

      const aiMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키로 전송
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 시간 포맷
  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chatbot-container">
      {/* 사이드바 */}
      <aside className="chatbot-sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span className="icon">+</span>
            새 대화
          </button>
        </div>

        <div className="conversations-list">
          {conversations.map(conv => (
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

      {/* 메인 채팅 영역 */}
      <main className="chatbot-main">
        <div className="chat-header">
          <h2>학습 도우미 AI</h2>
          <p className="chat-subtitle">국가기술자격 시험 준비를 도와드립니다</p>
        </div>

        <div className="messages-container" ref={messagesContainerRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">{formatTime(message.timestamp)}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant-message">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <span className="file-icon">📎</span>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button className="remove-file-btn" onClick={handleRemoveFile}>
                ✕
              </button>
            </div>
          )}
          <div className="input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".txt,.md,.py,.js,.json,.csv,.xml,.html,.css,.java,.cpp,.c,.h"
            />
            <button
              className="file-upload-button"
              onClick={handleFileButtonClick}
              disabled={isLoading}
              title="파일 업로드"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              rows="1"
              disabled={isLoading}
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="input-hint">
            AI가 생성한 정보는 부정확할 수 있습니다. 중요한 정보는 공식 자료를 확인하세요.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Chatbot;