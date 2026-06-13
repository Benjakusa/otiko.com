import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware to log API request metrics: IDs, methods, routes, processing time frames
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", "unknown")
        
        # Process the request
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        response.headers["X-Request-ID"] = request_id
        
        print(f"[RequestLog] ID: {request_id} | {request.method} {request.url.path} | Status: {response.status_code} | Time: {process_time:.2f}ms")
        return response
