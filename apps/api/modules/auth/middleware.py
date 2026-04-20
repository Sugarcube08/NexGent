from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from backend.modules.billing import service as billing_service
import logging

logger = logging.getLogger(__name__)

class X402PaymentMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only enforce on /agents/run for now
        if request.url.path == "/agents/run" and request.method == "POST":
            # This is a simplified version of x402 enforcement
            # In a full implementation, the client would send a payment signature in the header
            payment_sig = request.headers.get("X-Payment-Signature")
            reference = request.headers.get("X-Payment-Reference")
            
            if not payment_sig and not reference:
                raise HTTPException(status_code=402, detail="Payment Required: x402 header missing")
            
        response = await call_next(request)
        return response
