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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 메시지가 추가되면 스크롤을 맨 아래로
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // 대화 제목 업데이트 (첫 메시지일 경우)
    if (messages.length === 1) {
      const title = inputMessage.trim().substring(0, 30) + (inputMessage.trim().length > 30 ? '...' : '');
      setConversations(conversations.map(conv =>
        conv.id === activeConversationId ? { ...conv, title } : conv
      ));
    }

    try {
      // OpenAI API 호출
      const response = await fetch('http://localhost:3001/api/openai/chat', {
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
              content: inputMessage.trim()
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();

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

        <div className="messages-container">
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
          <div className="input-wrapper">
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
              disabled={!inputMessage.trim() || isLoading}
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
