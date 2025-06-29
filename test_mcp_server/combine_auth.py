import argparse
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from mcp.server import Server
import logging
import uvicorn
import contextvars

request_context = contextvars.ContextVar("request_context")

# 定义 API Key 和权限映射
API_KEY_PERMISSIONS = {
    "key1": ["add", "subtract"],
    "key2": ["add"],
    "key3": ["subtract"],
}

def check_permissions( tool_name: str) -> bool:
    auth_token = request_context.get().get("auth_token")
    permissions = API_KEY_PERMISSIONS.get(auth_token, [])
    if tool_name not in permissions:
        raise ValueError(f"Permission denied for tool: {tool_name}")
    return True


class AuthMiddleware(BaseHTTPMiddleware):
    """
    中间件，用于校验请求头中的 Authorization。
    """
    async def dispatch(self, request, call_next):
        # 从请求头中提取 Authorization
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse({"error": "Unauthorized"}, status_code=401)

        # 提取 token 并校验
        token = auth_header.split("Bearer ")[1]

        if token not in API_KEY_PERMISSIONS:
            return JSONResponse({"error": "Invalid API key"}, status_code=401)

        # 将请求上下文存储到全局变量中
        request_context.set({"auth_token": token})

        # 如果校验通过，继续处理请求
        return await call_next(request)


# 定义服务器名称
MCP_SERVER_NAME = "math-mcp-sse"

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(MCP_SERVER_NAME)

# 初始化 FastMCP 实例
mcp = FastMCP(MCP_SERVER_NAME)

@mcp.tool()
def add(a: float, b: float):
    """
    Add two numbers.

    Parameters:
    - a (float): First number (required)
    - b (float): Second number (required)

    Returns:
    - The result of a + b
    """
    # 检查权限
    check_permissions("add")
    return a + b

@mcp.tool()
def subtract(a: float, b: float):
    """
    Subtract two numbers.

    Parameters:
    - a (float): The number to subtract from (required)
    - b (float): The number to subtract (required)

    Returns:
    - The result of a - b
    """
    # 检查权限
    check_permissions("subtract")
    return a - b


# 创建 Starlette 应用
def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    """Create a Starlette application that can serve the provided mcp server with SSE."""
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,
        ) as (read_stream, write_stream):
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    app = Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )

    # 添加认证中间件
    app.add_middleware(AuthMiddleware)
    return app

if __name__ == "__main__":
    mcp_server = mcp._mcp_server

    # 解析命令行参数
    parser = argparse.ArgumentParser(description='Run MCP SSE-based server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=18081, help='Port to listen on')
    args = parser.parse_args()

    # 创建并运行 Starlette 应用
    starlette_app = create_starlette_app(mcp_server, debug=True)
    uvicorn.run(starlette_app, host=args.host, port=args.port)