# Adinera2

```
    _       _ _                    ____
   / \   __| (_)_ __   ___ _ __ __ _|___ \
  / _ \ / _` | | '_ \ / _ \ '__/ _` | __) |
 / ___ \ (_| | | | | |  __/ | | (_| |/ __/
/_/   \_\__,_|_|_| |_|\___|_|  \__,_|_____|
```

[![Adinera2 CI](https://github.com/groxaxo/Adinera2/actions/workflows/ci.yml/badge.svg)](https://github.com/groxaxo/Adinera2/actions/workflows/ci.yml)
[![Adinera2 E2E](https://github.com/groxaxo/Adinera2/actions/workflows/e2e.yml/badge.svg)](https://github.com/groxaxo/Adinera2/actions/workflows/e2e.yml)
[![License](https://img.shields.io/github/license/groxaxo/Adinera2)](https://github.com/groxaxo/Adinera2/blob/main/LICENSE)

Adinera2 is an open-source AI agent CLI that brings the power of OpenAI and
other LLMs directly into your terminal. It provides flexible access to multiple
AI providers through custom API endpoints, giving you the freedom to choose your
AI backend.

## 🚀 Why Adinera2?

- **🔓 Bring Your Own Provider**: Use OpenAI, custom OpenAI-compatible
  endpoints, or continue using Gemini
- **🔑 Simple Authentication**: API key-based authentication with support for
  custom endpoints
- **🔧 Built-in tools**: File operations, shell commands, web fetching
- **🔌 Extensible**: MCP (Model Context Protocol) support for custom
  integrations
- **💻 Terminal-first**: Designed for developers who live in the command line
- **🛡️ Open source**: Apache 2.0 licensed

## 📦 Installation

### Pre-requisites before installation

- Node.js version 20 or higher
- macOS, Linux, or Windows

### Quick Install

#### Install globally with npm

```bash
npm install -g adinera2
```

## 🔐 Authentication Options

Choose the authentication method that best fits your needs:

### Option 1: OpenAI API Key (Default)

**✨ Best for:** Anyone who wants to use OpenAI models or OpenAI-compatible
providers

**Benefits:**

- **Custom endpoints**: Set `OPENAI_BASE_URL` to use any OpenAI-compatible API
- **Multiple providers**: Use OpenAI, Azure OpenAI, or other compatible services
- **Model selection**: Choose specific models (gpt-4o, gpt-4-turbo,
  gpt-3.5-turbo, etc.)

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Optional: Use a custom endpoint (e.g., Azure OpenAI, local LLM, etc.)
export OPENAI_BASE_URL="https://your-custom-endpoint.com/v1"

adinera2
```

### Option 2: Login with Google (For Gemini)

**✨ Best for:** Individual developers who want to use Google's Gemini models

**Benefits:**

- **Free tier**: 60 requests/min and 1,000 requests/day
- **Gemini 2.5 Pro** with 1M token context window
- **No API key management** - just sign in with your Google account

```bash
adinera2
# Then choose "Login with Google" option
```

### Option 3: Gemini API Key

**✨ Best for:** Developers who need specific Gemini model control

```bash
# Get your key from https://aistudio.google.com/apikey
export GEMINI_API_KEY="YOUR_API_KEY"
adinera2
```

### Option 4: Vertex AI

**✨ Best for:** Enterprise teams using Google Cloud

```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
adinera2
```

## 🚀 Getting Started

### Basic Usage

#### Start in current directory

```bash
adinera2
```

#### Use specific model

```bash
adinera2 -m gpt-4o
adinera2 -m gpt-3.5-turbo
adinera2 -m gemini-2.5-pro
```

#### Non-interactive mode for scripts

Get a simple text response:

```bash
adinera2 -p "Explain the architecture of this codebase"
```

For more advanced scripting, use the `--output-format json` flag:

```bash
adinera2 -p "Explain the architecture of this codebase" --output-format json
```

For real-time event streaming:

```bash
adinera2 -p "Run tests and deploy" --output-format stream-json
```

### Quick Examples

#### Start a new project

```bash
cd new-project/
adinera2
> Write me a Discord bot that answers questions using a FAQ.md file I will provide
```

#### Analyze existing code

```bash
git clone https://github.com/your/repo
cd repo
adinera2
> Give me a summary of all of the changes that went in yesterday
```

## 🤝 Contributing

We welcome contributions! Adinera2 is fully open source (Apache 2.0), and we
encourage the community to:

- Report bugs and suggest features
- Improve documentation
- Submit code improvements
- Share your MCP servers and extensions

## 📖 Resources

- **[GitHub Issues](https://github.com/groxaxo/Adinera2/issues)** - Report bugs
  or request features

## 📄 Legal

- **License**: [Apache License 2.0](LICENSE)

---

<p align="center">
  Built with ❤️ by the open source community
</p>
