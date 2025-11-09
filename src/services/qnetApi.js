/**
 * Q-Net API Service
 * Connects to Korean Q-Net (한국산업인력공단) API through proxy server
 */

const PROXY_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Parse XML string to JavaScript object
 */
function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML parsing error: ' + parserError.textContent);
  }

  return xmlDoc;
}

/**
 * Convert XML document to JSON object
 */
function xmlToJson(xml) {
  const obj = {};

  if (xml.nodeType === 1) { // element node
    // Attributes
    if (xml.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < xml.attributes.length; i++) {
        const attribute = xml.attributes.item(i);
        obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) { // text node
    obj.text = xml.nodeValue;
  }

  // Children
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const item = xml.childNodes.item(i);
      const nodeName = item.nodeName;

      if (nodeName === '#text') {
        const text = item.nodeValue.trim();
        if (text) {
          return text;
        }
      } else {
        if (typeof obj[nodeName] === 'undefined') {
          obj[nodeName] = xmlToJson(item);
        } else {
          if (typeof obj[nodeName].push === 'undefined') {
            const old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(xmlToJson(item));
        }
      }
    }
  }

  return obj;
}

/**
 * Generic fetch function for all Q-Net APIs
 */
async function fetchQNetAPI(endpoint, params = {}) {
  try {
    const queryParams = new URLSearchParams(params);
    const url = `${PROXY_BASE_URL}/api/qnet/${endpoint}?${queryParams.toString()}`;

    console.log(`Fetching ${endpoint} from proxy:`, url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('Raw XML Response:', xmlText.substring(0, 500) + '...');

    const xmlDoc = parseXML(xmlText);
    const jsonData = xmlToJson(xmlDoc);

    return {
      success: true,
      data: jsonData,
      raw: xmlText
    };
  } catch (error) {
    console.error('Q-Net API Error:', error);
    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}

// ============================================
// 시험 일정 조회 APIs (InquiryTestInformationNTQSVC)
// ============================================

/**
 * 기술사 시험 시행일정 조회 (전체 데이터)
 */
export async function getPEList() {
  return fetchQNetAPI('pe-list');
}

/**
 * 기능장 시험 시행일정 조회 (전체 데이터)
 */
export async function getMCList() {
  return fetchQNetAPI('mc-list');
}

/**
 * 기사, 산업기사 시험 시행일정 조회 (전체 데이터)
 */
export async function getEList() {
  return fetchQNetAPI('e-list');
}

/**
 * 기능사 시험 시행일정 조회 (전체 데이터)
 */
export async function getCList() {
  return fetchQNetAPI('c-list');
}

/**
 * 종목별 응시수수료 조회
 * @param {Object} params - Query parameters (REQUIRED)
 * @param {string} params.jmCd - 종목코드 (필수)
 */
export async function getFeeList(params = {}) {
  if (!params.jmCd) {
    return {
      success: false,
      error: '종목코드(jmCd)는 필수 항목입니다.'
    };
  }
  return fetchQNetAPI('fee-list', params);
}

/**
 * 종목별 시행일정 목록 조회
 * @param {Object} params - Query parameters (REQUIRED)
 * @param {string} params.jmCd - 종목코드 (필수)
 */
export async function getJMList(params = {}) {
  if (!params.jmCd) {
    return {
      success: false,
      error: '종목코드(jmCd)는 필수 항목입니다.'
    };
  }
  return fetchQNetAPI('jm-list', params);
}

// ============================================
// 국가기술자격 종목 목록 조회 API (InquiryListNationalQualifcationSVC)
// ============================================

/**
 * 국가기술자격 종목 목록 조회 (전체 데이터)
 * 종목코드와 종목명을 가져오기 위한 API
 */
export async function getQualificationList() {
  return fetchQNetAPI('qualification-list');
}

