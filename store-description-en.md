# MCP Security Inspector - Chrome Web Store Description (English)

## Short Description (132 characters max)
MCP protocol debugger & security inspector — connect servers, import mcp.json, AI-powered audits

## Detailed Description

MCP Security Inspector is a Chrome extension for **Model Context Protocol (MCP)** remote servers, combining **protocol debugging** and **AI-enhanced security inspection** for developers and security researchers.

### 🔌 MCP Protocol Explorer

- **SSE** and **Streamable HTTP** transport modes
- Browse and invoke tools, read resources, get prompts
- Custom headers and combined auth (Bearer / Basic / API Key, etc.)
- Configurable result display (`{{auto}}` formatting, raw/formatted dual view)

### 📥 Config Import / Export

- **Import** `mcp.json` from Cursor, Claude Desktop, VS Code, Windsurf, and more
- Preview before import with source detection
- Auto-filters local stdio servers and unsupported modes
- **Export** standard `mcp.json` for use in other MCP clients

### 🛡️ Security Inspection

- **Tools**: input validation, permissions, injection, data leakage
- **Resources**: path traversal, access control, sensitive data exposure
- **Prompts**: prompt injection, role manipulation, context pollution
- **AI-enhanced**: OpenAI, Claude, Gemini integration with automated test cases
- **Dual modes**: active scanning + passive monitoring

### 🔧 How to Use

1. Click the extension icon to open MCP Security Inspector
2. Import an existing `mcp.json` or configure a server connection manually
3. Invoke tools, resources, and prompts in the MCP Explorer
4. (Optional) Configure an LLM service, run security checks, and review reports

### 🎯 Target Users

- MCP protocol developers
- AI application and security researchers
- Teams auditing remote MCP services

### 🔒 Privacy

- Detection and configs processed locally
- No personal data collection
- API keys stored only in browser local storage

### 📋 Requirements

- Chrome 88+
- Access to MCP-compatible remote servers

## Tags
MCP, Model Context Protocol, Security, Testing, Developer Tools, API Testing, Cursor, mcp.json

## Category
Developer Tools

## Language Support
- English
- Chinese (Simplified)

## What's New in v2.1.0
- Standard `mcp.json` import/export (Cursor, Claude, VS Code, Windsurf)
- Import preview with source detection and skip reasons
- Click-to-load saved configs with selection highlight
