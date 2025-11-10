"""
Q-Net API Service
Handles all Q-Net API requests
"""

import httpx
from typing import Dict, Any
from urllib.parse import urlencode
from fastapi import HTTPException

from config.settings import QNET_SERVICE_KEY


async def make_qnet_request(base_url: str, endpoint: str, params: Dict[str, Any]) -> tuple:
    """
    Make HTTP request to Q-Net API

    Args:
        base_url: Base URL of the Q-Net API
        endpoint: API endpoint
        params: Query parameters

    Returns:
        Tuple of (status_code, response_text)
    """
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # Build query params like Node.js URLSearchParams
        query_params = {
            "serviceKey": QNET_SERVICE_KEY,
            **params
        }

        # Build query string using urlencode
        query_string = urlencode(query_params)
        url = f"{base_url}/{endpoint}?{query_string}"

        print(f"🔗 Requesting Q-Net API: {url}")

        try:
            response = await client.get(url)
            print(f"✅ Q-Net API Response: status={response.status_code}, length={len(response.text)}")

            # Check for API errors in XML
            if "resultCode" in response.text:
                if "<resultCode>99</resultCode>" in response.text or "<resultCode>00</resultCode>" not in response.text:
                    print(f"⚠️ Response preview: {response.text[:500]}")

            return response.status_code, response.text
        except Exception as e:
            print(f"❌ Q-Net API Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
