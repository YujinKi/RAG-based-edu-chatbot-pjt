import React, { useState, useEffect } from 'react';
import { getQualificationList } from '../services/qnetApi';
import './StudyPlan.css';

function StudyPlan() {
  const [loading, setLoading] = useState(false);
  const [qualificationList, setQualificationList] = useState([]);
  const [loadingQualifications, setLoadingQualifications] = useState(false);

  // 검색 및 선택 관련 state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);

  // 직무분야 필터 관련 state
  const [selectedObligFld, setSelectedObligFld] = useState('');
  const [selectedMdObligFld, setSelectedMdObligFld] = useState('');

  // 시험 일정 관련 state
  const [examSchedules, setExamSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 공부 시작 날짜
  const [startDate, setStartDate] = useState('');

  // 학습 계획 관련 state
  const [studyPlan, setStudyPlan] = useState(null);
  const [error, setError] = useState(null);

  // 컴포넌트 마운트 시 종목 목록 로드
  useEffect(() => {
    loadQualifications();
  }, []);

  // 종목 선택 시 시험 일정 로드
  useEffect(() => {
    if (selectedSubject) {
      console.log('🎯 useEffect triggered for subject:', selectedSubject);
      loadExamSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  const loadQualifications = async () => {
    setLoadingQualifications(true);
    try {
      const response = await getQualificationList();

      if (response.success) {
        let items = [];

        if (response.data?.response?.body?.items?.item) {
          const rawItems = response.data.response.body.items.item;
          items = Array.isArray(rawItems) ? rawItems : [rawItems];
        } else if (response.data?.response?.body?.item) {
          const rawItems = response.data.response.body.item;
          items = Array.isArray(rawItems) ? rawItems : [rawItems];
        }

        setQualificationList(items);
      } else {
        console.error('Failed to load qualifications:', response.error);
        setError('종목 목록을 불러오는데 실패했습니다: ' + response.error);
      }
    } catch (err) {
      console.error('Error loading qualifications:', err);
      setError('오류가 발생했습니다: ' + err.message);
    } finally {
      setLoadingQualifications(false);
    }
  };

  // 시험 일정 로드
  const loadExamSchedules = async () => {
    if (!selectedSubject) return;

    console.log('🔍 Loading exam schedules for:', selectedSubject.name, selectedSubject.code);

    setLoadingSchedules(true);
    setExamSchedules([]);
    setSelectedSchedule(null);
    setError(null);

    try {
      const url = `http://localhost:3001/api/qnet/jm-list?jmCd=${selectedSubject.code}`;
      console.log('📡 Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log('📄 XML Response length:', xmlText.length);
      console.log('📄 XML Response preview:', xmlText.substring(0, 500));

      // XML 파싱
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // 파싱 에러 체크
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        console.error('❌ XML Parser Error:', parserError[0].textContent);
        throw new Error('XML 파싱 오류가 발생했습니다.');
      }

      const items = xmlDoc.getElementsByTagName('item');
      console.log('📊 Found items:', items.length);

      const schedules = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const schedule = {
          description: getXMLValue(item, 'description') || getXMLValue(item, 'implplannm') || `${i + 1}회차`,
          docRegStartDt: getXMLValue(item, 'docRegStartDt') || getXMLValue(item, 'docregstartdt'),
          docRegEndDt: getXMLValue(item, 'docRegEndDt') || getXMLValue(item, 'docregenddt'),
          docExamDt: getXMLValue(item, 'docExamDt') || getXMLValue(item, 'docexamdt') || getXMLValue(item, 'docexamstartdt'),
          docPassDt: getXMLValue(item, 'docPassDt') || getXMLValue(item, 'docpassdt'),
          pracRegStartDt: getXMLValue(item, 'pracRegStartDt') || getXMLValue(item, 'pracregstartdt'),
          pracRegEndDt: getXMLValue(item, 'pracRegEndDt') || getXMLValue(item, 'pracregenddt'),
          pracExamStartDt: getXMLValue(item, 'pracExamStartDt') || getXMLValue(item, 'pracexamstartdt'),
          pracExamEndDt: getXMLValue(item, 'pracExamEndDt') || getXMLValue(item, 'pracexamenddt'),
          pracPassDt: getXMLValue(item, 'pracPassDt') || getXMLValue(item, 'pracpassdt') || getXMLValue(item, 'pracpassstartdt'),
        };

        console.log(`📅 Schedule ${i + 1}:`, schedule);
        schedules.push(schedule);
      }

      console.log('✅ Total schedules loaded:', schedules.length);
      setExamSchedules(schedules);

      // 첫 번째 일정 자동 선택
      if (schedules.length > 0) {
        setSelectedSchedule(schedules[0]);
        console.log('✅ Auto-selected first schedule');
      } else {
        console.warn('⚠️ No schedules found');
      }

    } catch (err) {
      console.error('❌ Error loading exam schedules:', err);
      setError('시험 일정을 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // XML 값 추출 헬퍼 함수
  const getXMLValue = (item, tagName) => {
    const element = item.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
  };

  // 날짜 포맷 함수
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}년 ${month}월 ${day}일`;
  };

  // 대직무분야 목록 추출
  const obligFldList = React.useMemo(() => {
    const uniqueObligFlds = new Map();
    qualificationList.forEach(item => {
      const code = item.obligfldcd || item.obligFldCd;
      const name = item.obligfldnm || item.obligFldNm;
      if (code && name && typeof name === 'string' && name.trim() && !uniqueObligFlds.has(code)) {
        uniqueObligFlds.set(code, name.trim());
      }
    });
    return Array.from(uniqueObligFlds, ([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [qualificationList]);

  // 중직무분야 목록 추출
  const mdObligFldList = React.useMemo(() => {
    if (!selectedObligFld) return [];

    const uniqueMdObligFlds = new Map();
    qualificationList
      .filter(item => {
        const obligCode = item.obligfldcd || item.obligFldCd;
        return obligCode === selectedObligFld;
      })
      .forEach(item => {
        const code = item.mdobligfldcd || item.mdObligFldCd;
        const name = item.mdobligfldnm || item.mdObligFldNm;
        if (code && name && typeof name === 'string' && name.trim() && !uniqueMdObligFlds.has(code)) {
          uniqueMdObligFlds.set(code, name.trim());
        }
      });
    return Array.from(uniqueMdObligFlds, ([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [qualificationList, selectedObligFld]);

  // 종목 필터링
  const filteredQualifications = qualificationList.filter(item => {
    if (selectedObligFld) {
      const obligCode = item.obligfldcd || item.obligFldCd;
      if (obligCode !== selectedObligFld) return false;
    }

    if (selectedMdObligFld) {
      const mdObligCode = item.mdobligfldcd || item.mdObligFldCd;
      if (mdObligCode !== selectedMdObligFld) return false;
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const jmNm = (item.jmfldnm || item.jmNm || '').toLowerCase();
      const jmCd = (item.jmcd || item.jmCd || '').toLowerCase();
      return jmNm.includes(searchLower) || jmCd.includes(searchLower);
    }

    return true;
  });

  // 종목 선택 핸들러
  const handleSubjectSelect = (item) => {
    const jmCd = item.jmcd || item.jmCd;
    const jmNm = item.jmfldnm || item.jmNm;

    setSelectedSubject({
      code: jmCd,
      name: jmNm,
      item: item
    });
    setSearchTerm(jmNm);
    setSelectedSchedule(null);
    setStartDate('');
    setStudyPlan(null);
    setError(null);
  };

  // 학습 계획 생성
  const generateStudyPlan = async () => {
    if (!selectedSubject) {
      setError('종목을 선택해주세요.');
      return;
    }

    if (!selectedSchedule) {
      setError('시험 일정을 선택해주세요.');
      return;
    }

    if (!startDate) {
      setError('공부 시작 날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setStudyPlan(null);

    try {
      // OpenAI API 호출
      const response = await fetch('http://localhost:3001/api/openai/generate-study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: selectedSubject.name,
          exam_schedule: selectedSchedule,
          start_date: startDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate study plan');
      }

      const data = await response.json();
      setStudyPlan(data);

    } catch (err) {
      console.error('Error generating study plan:', err);
      setError('학습 계획 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 초기화
  const handleReset = () => {
    setSelectedObligFld('');
    setSelectedMdObligFld('');
    setSelectedSubject(null);
    setSearchTerm('');
    setExamSchedules([]);
    setSelectedSchedule(null);
    setStartDate('');
    setStudyPlan(null);
    setError(null);
  };

  return (
    <div className="page-container">
      <h1>AI 학습 계획 생성기</h1>
      <p>응시하고 싶은 종목을 선택하면 AI가 맞춤 학습 계획을 생성해드립니다</p>

      <div className="study-plan-container">
        {/* 종목 선택 섹션 */}
        <div className="selection-section">
          <h2>1단계: 종목 선택</h2>

          {loadingQualifications ? (
            <div className="loading-message">
              <p>종목 목록을 불러오는 중...</p>
            </div>
          ) : (
            <>
              {/* 1단계: 대직무분야 선택 */}
              {!selectedObligFld && (
                <div className="step-section">
                  <h3>대직무분야 선택</h3>
                  <div className="category-grid">
                    {obligFldList.map((item, index) => (
                      <div
                        key={`oblig-${String(item.code)}-${index}`}
                        className="category-card"
                        onClick={() => {
                          setSelectedObligFld(item.code);
                          setSelectedMdObligFld('');
                          setSelectedSubject(null);
                          setSearchTerm('');
                        }}
                      >
                        <div className="category-icon">📁</div>
                        <div className="category-name">{item.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2단계: 중직무분야 선택 */}
              {selectedObligFld && !selectedMdObligFld && (
                <div className="step-section">
                  <div className="step-header">
                    <h3>
                      중직무분야 선택
                      <span className="breadcrumb">
                        ({obligFldList.find(f => f.code === selectedObligFld)?.name})
                      </span>
                    </h3>
                    <button className="back-button" onClick={() => setSelectedObligFld('')}>
                      ← 대직무분야 다시 선택
                    </button>
                  </div>
                  <div className="category-grid">
                    {mdObligFldList.map((item, index) => (
                      <div
                        key={`mdoblig-${String(item.code)}-${index}`}
                        className="category-card"
                        onClick={() => {
                          setSelectedMdObligFld(item.code);
                          setSelectedSubject(null);
                          setSearchTerm('');
                        }}
                      >
                        <div className="category-icon">📂</div>
                        <div className="category-name">{item.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3단계: 종목 선택 */}
              {selectedMdObligFld && (
                <div className="step-section">
                  <div className="step-header">
                    <h3>
                      종목 선택
                      <span className="breadcrumb">
                        ({mdObligFldList.find(f => f.code === selectedMdObligFld)?.name})
                      </span>
                    </h3>
                    <button className="back-button" onClick={() => setSelectedMdObligFld('')}>
                      ← 중직무분야 다시 선택
                    </button>
                    <button className="reset-button" onClick={handleReset}>
                      ↺ 처음부터 다시
                    </button>
                  </div>

                  {/* 검색 필터 */}
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="종목명 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  {selectedSubject ? (
                    <div className="selected-subject">
                      <p>✅ 선택된 종목: <strong>{selectedSubject.name}</strong> ({selectedSubject.code})</p>
                      <button className="change-button" onClick={() => {
                        setSelectedSubject(null);
                        setSearchTerm('');
                        setExamSchedules([]);
                        setSelectedSchedule(null);
                      }}>
                        종목 다시 선택
                      </button>
                    </div>
                  ) : (
                    <div className="subject-grid">
                      {filteredQualifications.map((item, index) => {
                        const jmCode = item.jmcd || item.jmCd;
                        const jmName = item.jmfldnm || item.jmNm;
                        return (
                          <div
                            key={`jm-${String(jmCode)}-${index}`}
                            className="subject-card"
                            onClick={() => handleSubjectSelect(item)}
                          >
                            <div className="subject-code">[{jmCode}]</div>
                            <div className="subject-name">{jmName}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 시험 일정 선택 섹션 */}
        {selectedSubject && (
          <div className="selection-section">
            <h2>2단계: 시험 일정 선택</h2>

            {loadingSchedules ? (
              <div className="loading-message">
                <p>시험 일정을 불러오는 중...</p>
              </div>
            ) : examSchedules.length === 0 ? (
              <div className="info-message">
                <p>⚠️ 해당 종목의 시험 일정을 찾을 수 없습니다.</p>
              </div>
            ) : (
              <div className="schedule-list">
                {examSchedules.map((schedule, index) => (
                  <div
                    key={index}
                    className={`schedule-card ${selectedSchedule === schedule ? 'selected' : ''}`}
                    onClick={() => setSelectedSchedule(schedule)}
                  >
                    <h3>{schedule.description}</h3>
                    <div className="schedule-details">
                      {schedule.docRegStartDt && (
                        <p>📝 필기 원서접수: {formatDate(schedule.docRegStartDt)} ~ {formatDate(schedule.docRegEndDt)}</p>
                      )}
                      {schedule.docExamDt && (
                        <p>📖 필기시험: {formatDate(schedule.docExamDt)}</p>
                      )}
                      {schedule.docPassDt && (
                        <p>📋 필기 합격발표: {formatDate(schedule.docPassDt)}</p>
                      )}
                      {schedule.pracRegStartDt && (
                        <p>📝 실기 원서접수: {formatDate(schedule.pracRegStartDt)} ~ {formatDate(schedule.pracRegEndDt)}</p>
                      )}
                      {schedule.pracExamStartDt && (
                        <p>🔧 실기시험: {formatDate(schedule.pracExamStartDt)} ~ {formatDate(schedule.pracExamEndDt)}</p>
                      )}
                      {schedule.pracPassDt && (
                        <p>🎉 최종 합격발표: {formatDate(schedule.pracPassDt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 공부 시작 날짜 선택 */}
        {selectedSchedule && (
          <div className="selection-section">
            <h2>3단계: 공부 시작 날짜 선택</h2>
            <div className="date-picker-section">
              <label htmlFor="start-date">공부를 시작할 날짜를 선택하세요:</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
              {startDate && (
                <p className="date-info">
                  선택된 날짜: <strong>{new Date(startDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* 학습 계획 생성 버튼 */}
        {selectedSubject && selectedSchedule && startDate && (
          <div className="generate-section">
            <h2>4단계: AI 학습 계획 생성</h2>
            <button
              className="generate-button"
              onClick={generateStudyPlan}
              disabled={loading}
            >
              {loading ? '학습 계획 생성 중...' : 'AI 학습 계획 생성하기'}
            </button>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="error-section">
            <h3>오류</h3>
            <p>{error}</p>
          </div>
        )}

        {/* 학습 계획 결과 */}
        {studyPlan && (
          <div className="result-section">
            <h2>5단계: 맞춤 학습 계획</h2>
            <div className="study-plan-content">
              <h3>{studyPlan.subject}</h3>
              <div className="plan-text">
                {studyPlan.study_plan.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyPlan;
