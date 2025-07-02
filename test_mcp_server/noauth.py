import argparse
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from mcp.server import Server
import logging
import uvicorn

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
def add(a: float, b: float) -> float:
    """
    Add two numbers.

    Parameters:
    - a (float): First number (required)
    - b (float): Second number (required)

    Returns:
    - float: The result of a + b
    """
    return a + b

@mcp.tool()
def subtract(a: float, b: float) -> float:
    """
    Subtract two numbers.

    Parameters:
    - a (float): The number to subtract from (required)
    - b (float): The number to subtract (required)

    Returns:
    - float: The result of a - b
    """
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

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )

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