import React, { useState, useEffect } from 'react';
import {
  getPEList,
  getMCList,
  getEList,
  getCList,
  getFeeList,
  getJMList,
  getQualificationList
} from '../services/qnetApi';
import './ApiTest.css';

function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('getEList');

  // 종목 목록 관련 state
  const [qualificationList, setQualificationList] = useState([]);
  const [selectedJmCd, setSelectedJmCd] = useState('');
  const [loadingQualifications, setLoadingQualifications] = useState(false);
  const [jmSearchTerm, setJmSearchTerm] = useState('');

  // 직무분야 관련 state
  const [selectedObligFld, setSelectedObligFld] = useState('');
  const [selectedMdObligFld, setSelectedMdObligFld] = useState('');

  // 종목 목록 로드 함수
  const loadQualifications = async () => {
    setLoadingQualifications(true);
    try {
      const response = await getQualificationList();
      console.log('🔍 Qualification API Response:', response);

      if (response.success) {
        console.log('📦 Raw qualification data:', response.data);

        // 다양한 XML 구조 지원
        let items = [];

        // 일반적인 구조: response.body.items.item
        if (response.data?.response?.body?.items?.item) {
          const rawItems = response.data.response.body.items.item;
          items = Array.isArray(rawItems) ? rawItems : [rawItems];
        }
        // 대안 구조: response.body.item
        else if (response.data?.response?.body?.item) {
          const rawItems = response.data.response.body.item;
          items = Array.isArray(rawItems) ? rawItems : [rawItems];
        }

        console.log('✅ Extracted items:', items);
        console.log('📊 Total items:', items.length);

        if (items.length > 0) {
          console.log('📝 Sample item:', items[0]);
          console.log('🔑 Fields available:', Object.keys(items[0]));
        }

        setQualificationList(items);
      } else {
        console.error('❌ Failed to load qualifications:', response.error);
        alert('종목 목록을 불러오는데 실패했습니다: ' + response.error);
      }
    } catch (err) {
      console.error('❌ Error loading qualifications:', err);
      alert('오류가 발생했습니다: ' + err.message);
    } finally {
      setLoadingQualifications(false);
    }
  };

  // 종목코드가 필요한 엔드포인트가 선택되면 자동으로 종목 목록 로드
  useEffect(() => {
    if ((selectedEndpoint === 'getFeeList' || selectedEndpoint === 'getJMList') && 
        qualificationList.length === 0) {
      loadQualifications();
    }
  }, [selectedEndpoint]);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      let apiParams = {};

      // 종목코드가 필요한 API인 경우 자동으로 종목코드 검색
      if (selectedEndpoint === 'getFeeList' || selectedEndpoint === 'getJMList') {
        // 검색어가 있으면 종목 목록에서 검색
        if (jmSearchTerm.trim()) {
          // 종목 목록이 없으면 먼저 로드
          if (qualificationList.length === 0) {
            setError('종목 목록을 불러오는 중...');
            await loadQualifications();
          }

          // 검색어로 종목 찾기 (API 응답 필드: jmcd, jmfldnm)
          const searchLower = jmSearchTerm.toLowerCase();
          const foundItem = qualificationList.find(item => {
            const jmNm = (item.jmfldnm || item.jmNm || '').toLowerCase();
            const jmCd = (item.jmcd || item.jmCd || '').toLowerCase();
            return jmNm === searchLower || jmNm.includes(searchLower) || jmCd === searchLower;
          });

          if (!foundItem) {
            setError(`"${jmSearchTerm}"에 해당하는 종목을 찾을 수 없습니다. 정확한 종목명을 입력하거나 검색 결과에서 선택해주세요.`);
            setLoading(false);
            return;
          }

          // 찾은 종목코드로 API 호출
          const jmCode = foundItem.jmcd || foundItem.jmCd;
          const jmName = foundItem.jmfldnm || foundItem.jmNm;
          console.log(`✅ 종목 찾음: [${jmCode}] ${jmName}`);
          setSelectedJmCd(jmCode);
          apiParams = { jmCd: jmCode };
        } else if (selectedJmCd) {
          // 이미 선택된 종목코드가 있으면 사용
          apiParams = { jmCd: selectedJmCd };
        } else {
          setError('종목을 검색하거나 선택해주세요.');
          setLoading(false);
          return;
        }
      }

      switch (selectedEndpoint) {
        case 'getPEList':
          response = await getPEList();
          break;
        case 'getMCList':
          response = await getMCList();
          break;
        case 'getEList':
          response = await getEList();
          break;
        case 'getCList':
          response = await getCList();
          break;
        case 'getFeeList':
          response = await getFeeList(apiParams);
          break;
        case 'getJMList':
          response = await getJMList(apiParams);
          break;
        case 'getQualificationList':
          response = await getQualificationList();
          break;
        default:
          response = await getEList();
      }

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 대직무분야 목록 추출 (중복 제거)
  const obligFldList = React.useMemo(() => {
    const uniqueObligFlds = new Map();
    qualificationList.forEach(item => {
      const code = item.obligfldcd || item.obligFldCd;
      const name = item.obligfldnm || item.obligFldNm;
      // name이 문자열이고 유효한 경우에만 추가
      if (code && name && typeof name === 'string' && name.trim() && !uniqueObligFlds.has(code)) {
        uniqueObligFlds.set(code, name.trim());
      }
    });
    return Array.from(uniqueObligFlds, ([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [qualificationList]);

  // 중직무분야 목록 추출 (대직무분야 선택 시 필터링)
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
        // name이 문자열이고 유효한 경우에만 추가
        if (code && name && typeof name === 'string' && name.trim() && !uniqueMdObligFlds.has(code)) {
          uniqueMdObligFlds.set(code, name.trim());
        }
      });
    return Array.from(uniqueMdObligFlds, ([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [qualificationList, selectedObligFld]);

  // 종목 검색 필터링 (직무분야 기반)
  const filteredQualifications = qualificationList.filter(item => {
    // 대직무분야 필터링
    if (selectedObligFld) {
      const obligCode = item.obligfldcd || item.obligFldCd;
      if (obligCode !== selectedObligFld) return false;
    }

    // 중직무분야 필터링
    if (selectedMdObligFld) {
      const mdObligCode = item.mdobligfldcd || item.mdObligFldCd;
      if (mdObligCode !== selectedMdObligFld) return false;
    }

    // 검색어 필터링
    if (jmSearchTerm.trim()) {
      const searchLower = jmSearchTerm.toLowerCase();
      const jmNm = (item.jmfldnm || item.jmNm || '').toLowerCase();
      const jmCd = (item.jmcd || item.jmCd || '').toLowerCase();
      return jmNm.includes(searchLower) || jmCd.includes(searchLower);
    }

    return true;
  });

  // 종목 선택 핸들러
  const handleJmSelect = (jmCd, jmNm) => {
    setSelectedJmCd(jmCd);
    setJmSearchTerm(jmNm);
  };

  // 날짜 형식 변환 함수 (yyyymmdd -> yyyy년 mm월 dd일)
  const formatDate = (value) => {
    // 8자리 숫자인 경우에만 날짜 형식으로 변환
    if (/^\d{8}$/.test(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      return `${year}년 ${month}월 ${day}일`;
    }
    return value;
  };

  // 시작일자-종료일자 쌍 매핑 (시작일자 필드명 -> 종료일자 필드명들)
  const datePairMapping = {
    // 필기시험원서접수
    'docRegStartDt': ['docRegEndDt', 'docregenddt'],
    'docregstartdt': ['docRegEndDt', 'docregenddt'],

    // 필기시험
    'docexamstartdt': ['docexamenddt'],

    // 실기시험원서접수
    'pracRegStartDt': ['pracRegEndDt', 'pracregenddt'],
    'pracregstartdt': ['pracRegEndDt', 'pracregenddt'],

    // 실기시험
    'pracExamStartDt': ['pracExamEndDt', 'pracexamenddt'],
    'pracexamstartdt': ['pracExamEndDt', 'pracexamenddt'],

    // 합격자발표
    'pracpassstartdt': ['pracpassenddt']
  };

  // 종료일자 필드들 (테이블에서 제외)
  const endDateFields = new Set([
    'docRegEndDt', 'docregenddt',
    'docexamenddt',
    'pracRegEndDt', 'pracregenddt',
    'pracExamEndDt', 'pracexamenddt',
    'pracpassenddt',
    // 응시자격 서류제출 관련 필드 (완전히 숨김)
    'docSubmitStartDt', 'docsubmitstartdt',
    'docSubmitEndDt', 'docsubmitenddt', 'docsubmitentdt'
  ]);

  // 필드 표시 순서 정의
  const fieldOrder = [
    // 필기시험 관련
    ['docRegStartDt', 'docregstartdt'],           // 필기원서접수기간
    ['docExamDt', 'docexamdt', 'docexamstartdt'], // 필기시험일자/기간
    ['docPassDt', 'docpassdt'],                   // 필기시험 합격(예정)자 발표일자
    // 실기시험 관련
    ['pracRegStartDt', 'pracregstartdt'],         // 실기시험원서접수기간
    ['pracExamStartDt', 'pracexamstartdt'],       // 실기시험기간
    ['pracPassDt', 'pracpassdt', 'pracpassstartdt'] // 합격자발표일자/기간
  ];

  // 영문 필드명을 한글로 매핑
  const fieldNameMapping = {
    // 회차 정보
    'description': '회차',
    'implplannm': '회차',

    // 필기시험 관련 (대소문자 모두 지원)
    'docRegStartDt': '필기시험원서접수기간',
    'docregstartdt': '필기시험원서접수기간',
    'docExamDt': '필기시험일자',
    'docexamdt': '필기시험일자',
    'docexamstartdt': '필기시험기간',
    'docPassDt': '필기시험 합격(예정)자 발표일자',
    'docpassdt': '필기시험 합격(예정)자 발표일자',

    // 실기/면접시험 관련 (대소문자 모두 지원)
    'pracRegStartDt': '실기시험원서접수기간',
    'pracregstartdt': '실기시험원서접수기간',
    'pracExamStartDt': '실기시험기간',
    'pracexamstartdt': '실기시험기간',
    'pracPassDt': '합격자발표일자',
    'pracpassdt': '합격자발표일자',
    'pracpassstartdt': '합격자발표기간',

    // 종목 정보 (대소문자 모두 지원)
    'jmCd': '종목코드',
    'jmcd': '종목코드',
    'jmNm': '종목명',
    'jmfldnm': '종목명',

    // 시행 정보
    'implYy': '시행년도',
    'implSeq': '회차',

    // 자격 구분 (대소문자 모두 지원)
    'qualgbCd': '자격구분코드',
    'qualgbcd': '자격구분코드',
    'qualgbNm': '자격구분명',
    'qualgbnm': '자격구분명',

    // 직무분야
    'obligfldcd': '대직무분야코드',
    'obligfldnm': '대직무분야명',
    'mdobligfldcd': '중직무분야코드',
    'mdobligfldnm': '중직무분야명',

    // 기타 정보
    'examStatus': '시험상태',
    'infogb': '정보구분',
    'contents': '내용',
    'instiNm': '시행기관명',
    'seriesnm': '계열명',
    'seriescd': '계열코드',

    // 응답 메타 정보
    'resultCode': '결과코드',
    'resultMsg': '결과메시지',
    'numOfRows': '한 페이지 결과 수',
    'pageNo': '페이지 번호',
    'totalCount': '전체 결과 수',
  };

  // XML에서 실제 데이터 아이템만 추출하는 함수
  const extractItems = (xmlData) => {
    try {
      // response > body > items > item 구조에서 item 추출
      if (xmlData?.response?.body?.items?.item) {
        const items = xmlData.response.body.items.item;
        return Array.isArray(items) ? items : [items];
      }
      return [];
    } catch (e) {
      console.error('Error extracting items:', e);
      return [];
    }
  };

  // XML 데이터를 테이블용 배열로 변환하는 함수 (행과 열 전환)
  const parseXMLToTableData = (xmlData) => {
    const items = extractItems(xmlData);

    if (items.length === 0) {
      return [];
    }

    // 모든 아이템의 데이터를 테이블 형태로 변환
    const allTableData = items.map((item, itemIndex) => {
      const itemData = {};
      let itemTitle = `항목 #${itemIndex + 1}`; // 기본값

      // 회차 정보 추출
      if (item.description) {
        itemTitle = item.description;
      } else if (item.implplannm) {
        itemTitle = item.implplannm;
      }

      itemData.itemTitle = itemTitle;
      itemData.fields = [];

      // 이미 처리된 필드 추적
      const processedKeys = new Set();

      // 정의된 순서대로 필드 처리
      fieldOrder.forEach(keyVariants => {
        // 현재 필드 그룹에서 실제 존재하는 키 찾기
        const foundKey = keyVariants.find(k => item[k] !== undefined && !processedKeys.has(k));

        if (foundKey) {
          const value = item[foundKey];
          processedKeys.add(foundKey);

          if (typeof value === 'string' || typeof value === 'number') {
            // 시작일자-종료일자 쌍 확인
            if (datePairMapping[foundKey]) {
              const endDateKeys = datePairMapping[foundKey];
              let endDateValue = null;
              let endDateKey = null;

              // 종료일자 필드 찾기
              for (const endKey of endDateKeys) {
                if (item[endKey]) {
                  endDateValue = item[endKey];
                  endDateKey = endKey;
                  break;
                }
              }

              if (endDateValue) {
                // 시작일자와 종료일자를 합쳐서 기간으로 표시
                const startDate = formatDate(String(value));
                const endDate = formatDate(String(endDateValue));
                itemData.fields.push({
                  fieldName: fieldNameMapping[foundKey] || foundKey,
                  fieldValue: `${startDate} ~ ${endDate}`
                });
                // 종료일자는 이미 처리됨으로 표시
                processedKeys.add(endDateKey);
              } else {
                // 종료일자가 없으면 시작일자만 표시
                itemData.fields.push({
                  fieldName: fieldNameMapping[foundKey] || foundKey,
                  fieldValue: formatDate(String(value))
                });
              }
            } else {
              // 일반 필드 처리
              itemData.fields.push({
                fieldName: fieldNameMapping[foundKey] || foundKey,
                fieldValue: formatDate(String(value))
              });
            }
          }
        }
      });

      // fieldOrder에 없는 나머지 필드들 처리 (순서 상관없음)
      Object.keys(item).forEach(key => {
        if (key === '@attributes') return;
        if (key === 'description' || key === 'implplannm') return;
        if (endDateFields.has(key)) return;
        if (processedKeys.has(key)) return;

        const value = item[key];
        if (typeof value === 'string' || typeof value === 'number') {
          itemData.fields.push({
            fieldName: fieldNameMapping[key] || key,
            fieldValue: formatDate(String(value))
          });
          processedKeys.add(key);
        }
      });

      return itemData;
    });

    return allTableData;
  };

  // 테이블 렌더링 함수 (행과 열 전환)
  const renderDataTable = (data) => {
    const itemsTableData = parseXMLToTableData(data);

    if (itemsTableData.length === 0) {
      return <p>검색 결과가 없습니다.</p>;
    }

    return (
      <div className="items-container">
        {itemsTableData.map((itemData, index) => (
          <div key={index} className="item-card">
            <div className="item-header">
              <h4>{itemData.itemTitle || `항목 #${index + 1}`}</h4>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {itemData.fields.map((field, fieldIndex) => (
                      <th key={fieldIndex}>{field.fieldName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {itemData.fields.map((field, fieldIndex) => (
                      <td key={fieldIndex}>{field.fieldValue}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1>Q-Net API Test</h1>
      <p>Test connection to Q-Net (한국산업인력공단) API</p>

      <div className="api-test-container">
        {/* API Endpoint Selection */}
        <div className="test-section">
          <h2>Select API Endpoint</h2>
          <div className="endpoint-selector">
            <h3 style={{marginTop: 0, color: '#2c3e50', fontSize: '1rem'}}>
              📅 시험 일정 조회 (InquiryTestInformationNTQSVC)
            </h3>
            <label>
              <input
                type="radio"
                value="getPEList"
                checked={selectedEndpoint === 'getPEList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getPEList - 기술사 시험 시행일정 조회</span>
            </label>
            <label>
              <input
                type="radio"
                value="getMCList"
                checked={selectedEndpoint === 'getMCList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getMCList - 기능장 시험 시행일정 조회</span>
            </label>
            <label>
              <input
                type="radio"
                value="getEList"
                checked={selectedEndpoint === 'getEList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getEList - 기사, 산업기사 시험 시행일정 조회</span>
            </label>
            <label>
              <input
                type="radio"
                value="getCList"
                checked={selectedEndpoint === 'getCList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getCList - 기능사 시험 시행일정 조회</span>
            </label>
            
            <h3 style={{marginTop: '1.5rem', color: '#2c3e50', fontSize: '1rem'}}>
              💰 종목별 조회 (종목코드 필요)
            </h3>
            <label>
              <input
                type="radio"
                value="getFeeList"
                checked={selectedEndpoint === 'getFeeList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getFeeList - 종목별 응시수수료 조회</span>
            </label>
            <label>
              <input
                type="radio"
                value="getJMList"
                checked={selectedEndpoint === 'getJMList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getJMList - 종목별 시행일정 목록 조회</span>
            </label>
            
            <h3 style={{marginTop: '1.5rem', color: '#2c3e50', fontSize: '1rem'}}>
              📋 국가기술자격 (InquiryListNationalQualifcationSVC)
            </h3>
            <label>
              <input
                type="radio"
                value="getQualificationList"
                checked={selectedEndpoint === 'getQualificationList'}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              />
              <span>getQualificationList - 국가기술자격 종목 목록 조회</span>
            </label>
          </div>
        </div>

        {/* Parameters */}
        <div className="test-section">
          <h2>Parameters</h2>
          
          {/* 종목코드가 필요한 API인 경우 */}
          {(selectedEndpoint === 'getFeeList' || selectedEndpoint === 'getJMList') ? (
            <div className="params-form">
              <div className="api-info-box" style={{marginBottom: '1.5rem'}}>
                <p>
                  <strong>🔍 종목 선택 (3단계)</strong><br/>
                  <strong>1단계:</strong> 대직무분야 선택 → <strong>2단계:</strong> 중직무분야 선택 → <strong>3단계:</strong> 종목 선택
                </p>
              </div>

              {loadingQualifications ? (
                <div className="loading-message">
                  <p>🔄 종목 목록을 불러오는 중...</p>
                </div>
              ) : qualificationList.length === 0 ? (
                <div className="hint-text" style={{background: '#fff3cd', borderColor: '#ffc107', color: '#856404'}}>
                  ⚠️ 종목 목록이 로드되지 않았습니다. 자동으로 로드를 시도하거나 아래 버튼을 클릭하세요.
                  <button
                    onClick={loadQualifications}
                    className="load-button"
                    style={{marginTop: '0.5rem'}}
                  >
                    종목 목록 불러오기
                  </button>
                </div>
              ) : (
                <>
                  {/* 1단계: 대직무분야 선택 */}
                  {!selectedObligFld && (
                    <div className="form-group">
                      <label>📁 1단계: 대직무분야 선택</label>
                      <div className="category-grid">
                        {obligFldList.map((item, index) => (
                          <div
                            key={`oblig-${String(item.code)}-${index}`}
                            className="category-card"
                            onClick={() => {
                              setSelectedObligFld(item.code);
                              setSelectedMdObligFld('');
                              setSelectedJmCd('');
                              setJmSearchTerm('');
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
                    <div className="form-group">
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                        <label style={{margin: 0}}>
                          📂 2단계: 중직무분야 선택
                          <span style={{fontSize: '0.9rem', color: '#7f8c8d', marginLeft: '0.5rem'}}>
                            (대직무분야: {obligFldList.find(f => f.code === selectedObligFld)?.name})
                          </span>
                        </label>
                        <button
                          className="load-button"
                          style={{padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: 0}}
                          onClick={() => {
                            setSelectedObligFld('');
                            setSelectedMdObligFld('');
                            setSelectedJmCd('');
                            setJmSearchTerm('');
                          }}
                        >
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
                              setSelectedJmCd('');
                              setJmSearchTerm('');
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
                    <div className="form-group">
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap'}}>
                        <label style={{margin: 0}}>
                          📄 3단계: 종목 선택
                          <span style={{fontSize: '0.9rem', color: '#7f8c8d', marginLeft: '0.5rem'}}>
                            (중직무분야: {mdObligFldList.find(f => f.code === selectedMdObligFld)?.name})
                          </span>
                        </label>
                        <button
                          className="load-button"
                          style={{padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: 0}}
                          onClick={() => {
                            setSelectedMdObligFld('');
                            setSelectedJmCd('');
                            setJmSearchTerm('');
                          }}
                        >
                          ← 중직무분야 다시 선택
                        </button>
                        <button
                          className="load-button"
                          style={{padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: 0}}
                          onClick={() => {
                            setSelectedObligFld('');
                            setSelectedMdObligFld('');
                            setSelectedJmCd('');
                            setJmSearchTerm('');
                          }}
                        >
                          ↺ 처음부터 다시
                        </button>
                      </div>

                      {selectedJmCd ? (
                        <div className="hint-text" style={{background: '#d4edda', borderColor: '#28a745', color: '#155724'}}>
                          ✅ 선택됨: <strong>[{selectedJmCd}] {jmSearchTerm}</strong>
                          <button
                            className="load-button"
                            style={{padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem', marginLeft: '1rem'}}
                            onClick={() => {
                              setSelectedJmCd('');
                              setJmSearchTerm('');
                            }}
                          >
                            종목 다시 선택
                          </button>
                        </div>
                      ) : (
                        <div className="category-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'}}>
                          {filteredQualifications.map((item, index) => {
                            const jmCode = item.jmcd || item.jmCd;
                            const jmName = item.jmfldnm || item.jmNm;
                            return (
                              <div
                                key={`jm-${String(jmCode)}-${index}`}
                                className="category-card"
                                style={{cursor: 'pointer'}}
                                onClick={() => handleJmSelect(jmCode, jmName)}
                              >
                                <div className="category-icon" style={{fontSize: '1.2rem'}}>[{jmCode}]</div>
                                <div className="category-name" style={{fontSize: '0.95rem'}}>{jmName}</div>
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
          ) : (
            <div className="params-form">
              <p className="info-text">
                ℹ️ 이 API는 별도의 파라미터 없이 전체 데이터를 조회합니다.
              </p>
            </div>
          )}
        </div>

        {/* Test Button */}
        <div className="test-section">
          <button
            className="test-button"
            onClick={handleTest}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="test-section error-section">
            <h2>Error</h2>
            <pre className="error-content">{error}</pre>
          </div>
        )}

        {result && (
          <div className="test-section result-section">
            <h2>✅ Success!</h2>

            {/* Table View */}
            <div className="result-block">
              <h3>응답 결과 (Response Elements):</h3>
              {renderDataTable(result.data)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApiTest;