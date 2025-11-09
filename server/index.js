/**
 * Express Proxy Server for Q-Net API
 * Handles CORS and proxies requests to Q-Net OpenAPI
 */

const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Q-Net API Configuration
const QNET_TEST_INFO_API = 'http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC';
const QNET_QUALIFICATION_API = 'http://openapi.q-net.or.kr/api/service/rest/InquiryListNationalQualifcationSVC';
const SERVICE_KEY = '892a0f45b2c4a8b1b0c247d38df541b7d5d3ea40e069481b41424cdd1a77bc54';

/**
 * Make HTTP request to Q-Net API
 */
function makeQnetRequest(baseUrl, endpoint, params) {
  return new Promise((resolve, reject) => {
    // Build query string
    const queryParams = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      ...params
    });

    const url = `${baseUrl}/${endpoint}?${queryParams.toString()}`;

    console.log('Requesting Q-Net API:', url);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Q-Net API Response received, length:', data.length);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });

    }).on('error', (err) => {
      console.error('Q-Net API Error:', err);
      reject(err);
    });
  });
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      testInfo: QNET_TEST_INFO_API,
      qualification: QNET_QUALIFICATION_API
    }
  });
});

// ============================================
// 시험 일정 조회 APIs (InquiryTestInformationNTQSVC)
// ============================================

/**
 * 기술사 시험 시행일정 조회
 */
app.get('/api/qnet/pe-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.implYy) params.implYy = req.query.implYy;
    if (req.query.implSeq) params.implSeq = req.query.implSeq;

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getPEList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getPEList:', error);
    res.status(500).json({
      error: 'Failed to fetch PE list',
      message: error.message
    });
  }
});

/**
 * 기능장 시험 시행일정 조회
 */
app.get('/api/qnet/mc-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.implYy) params.implYy = req.query.implYy;
    if (req.query.implSeq) params.implSeq = req.query.implSeq;

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getMCList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getMCList:', error);
    res.status(500).json({
      error: 'Failed to fetch MC list',
      message: error.message
    });
  }
});

/**
 * 기사, 산업기사 시험 시행일정 조회
 */
app.get('/api/qnet/e-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.implYy) params.implYy = req.query.implYy;
    if (req.query.implSeq) params.implSeq = req.query.implSeq;

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getEList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getEList:', error);
    res.status(500).json({
      error: 'Failed to fetch E list',
      message: error.message
    });
  }
});

/**
 * 기능사 시험 시행일정 조회
 */
app.get('/api/qnet/c-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.implYy) params.implYy = req.query.implYy;
    if (req.query.implSeq) params.implSeq = req.query.implSeq;

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getCList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getCList:', error);
    res.status(500).json({
      error: 'Failed to fetch C list',
      message: error.message
    });
  }
});

/**
 * 종목별 응시수수료 조회
 */
app.get('/api/qnet/fee-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.jmCd) params.jmCd = req.query.jmCd;

    if (!params.jmCd) {
      return res.status(400).json({
        error: 'jmCd parameter is required'
      });
    }

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getFeeList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getFeeList:', error);
    res.status(500).json({
      error: 'Failed to fetch fee list',
      message: error.message
    });
  }
});

/**
 * 종목별 시행일정 목록 조회
 */
app.get('/api/qnet/jm-list', async (req, res) => {
  try {
    const params = {};
    if (req.query.jmCd) params.jmCd = req.query.jmCd;

    if (!params.jmCd) {
      return res.status(400).json({
        error: 'jmCd parameter is required'
      });
    }

    const result = await makeQnetRequest(QNET_TEST_INFO_API, 'getJMList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getJMList:', error);
    res.status(500).json({
      error: 'Failed to fetch JM list',
      message: error.message
    });
  }
});

// ============================================
// 국가기술자격 종목 목록 조회 API (InquiryListNationalQualifcationSVC)
// ============================================

/**
 * 국가기술자격 종목 목록 조회
 */
app.get('/api/qnet/qualification-list', async (req, res) => {
  try {
    const params = {};
    // Optional parameters
    if (req.query.gno) params.gno = req.query.gno;

    const result = await makeQnetRequest(QNET_QUALIFICATION_API, 'getList', params);
    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error('Error proxying getList (Qualification):', error);
    res.status(500).json({
      error: 'Failed to fetch qualification list',
      message: error.message
    });
  }
});

// ============================================
// Legacy endpoints (하위 호환성)
// ============================================

app.get('/api/qnet/exam-list', async (req, res) => {
  console.warn('[DEPRECATED] /api/qnet/exam-list is deprecated. Use /api/qnet/e-list instead.');
  req.url = '/api/qnet/e-list';
  return app._router.handle(req, res);
});

app.get('/api/qnet/written-test-list', async (req, res) => {
  console.warn('[DEPRECATED] /api/qnet/written-test-list is deprecated.');
  return res.status(301).redirect('/api/qnet/qualification-list');
});

app.get('/api/qnet/practical-test-list', async (req, res) => {
  console.warn('[DEPRECATED] /api/qnet/practical-test-list is deprecated.');
  return res.status(301).redirect('/api/qnet/qualification-list');
});

app.get('/api/qnet/service-list', async (req, res) => {
  console.warn('[DEPRECATED] /api/qnet/service-list is deprecated.');
  return res.status(301).redirect('/api/qnet/qualification-list');
});

/**
 * Generic proxy endpoint - for flexibility
 */
app.get('/api/qnet/proxy/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const params = { ...req.query };

    // Remove our internal params
    delete params.serviceKey;

    const result = await makeQnetRequest(QNET_TEST_INFO_API, endpoint, params);

    res.status(result.statusCode).send(result.data);
  } catch (error) {
    console.error(`Error proxying ${req.params.endpoint}:`, error);
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║         Q-Net API Proxy Server Running                 ║
╚════════════════════════════════════════════════════════╝

  Port: ${PORT}

  Services:
  - InquiryTestInformationNTQSVC (시험 일정)
  - InquiryListNationalQualifcationSVC (종목 목록)

  Available endpoints:
  ✅ GET /api/health

  📅 시험 일정 조회:
  - GET /api/qnet/pe-list         (기술사)
  - GET /api/qnet/mc-list         (기능장)
  - GET /api/qnet/e-list          (기사, 산업기사)
  - GET /api/qnet/c-list          (기능사)
  - GET /api/qnet/fee-list        (종목별 수수료)
  - GET /api/qnet/jm-list         (종목별 일정)

  📋 국가기술자격:
  - GET /api/qnet/qualification-list

  🔧 Utility:
  - GET /api/qnet/proxy/:endpoint

  Ready to proxy requests! 🚀
  `);
});

module.exports = app;
