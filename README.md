# Agent Forge — AI Data Analyzer

An AI-powered data analysis assistant. Upload CSV/Parquet files and explore them through natural language conversation — get statistics, generate visualizations, and discover insights through chat.

Built with **FastAPI** + **Claude (Anthropic)** backend and **React + TypeScript** frontend with real-time SSE streaming.

---

## Features

- **Natural language data analysis** — ask questions in English or Ukrainian, get answers with tables, statistics, and insights
- **Auto-analysis on upload** — concise dataset overview, column dictionary, key stats, and data quality report
- **Interactive visualizations** — bar, line, scatter, histogram, pie, box, and heatmap charts (Recharts)
- **Agentic architecture** — Planner agent autonomously runs queries, creates charts, and presents findings
- **Streaming responses** — Server-Sent Events for real-time message delivery
- **DuckDB SQL execution** — safe SQL-only queries (no arbitrary code execution)
- **Data transformations** — add columns, filter rows — changes persist in session
- **Chart export** — save visualizations as PNG or copy Python (matplotlib) code
- **Data export** — export current or original data as CSV
- **Session management** — isolated sessions with own data and conversation history
- **Smart suggestions** — AI-generated prompt suggestions based on data columns
- **Quality evaluation** — runtime metrics (valid_answer, hallucination, unsafe_code) + LLM-as-a-Judge
- **Prompt polishing** — validates, classifies, and refines user prompts before processing
- **LaTeX math rendering** — statistical formulas rendered with KaTeX
- **Markdown tables** — query results displayed as formatted tables

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  App.tsx ← SSE stream ← /api/chat                   │
│  DataTab  │  PlotsTab  │  Chat panel                 │
└────────────────────┬────────────────────────────────┘
                     │ HTTP + SSE
┌────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                      │
│                                                      │
│  routes.py ──► PromptPolisher ──► Planner Agent      │
│                                      │               │
│                    ┌────────┬────────┬──────┐        │
│                    ▼        ▼        ▼      ▼        │
│              write_to_chat query  create_plot finish  │
│                           maker                      │
│                             │                        │
│                  QueryExecutor (DuckDB SQL)           │
│                             │                        │
│                   MetricsEvaluator + LLM Judge       │
│                             │                        │
│                  SessionManager (disk persistence)   │
└──────────────────────────────────────────────────────┘
```

### Backend

| Component | File | Description |
|-----------|------|-------------|
| **Planner Agent** | `agents/planner.py` | Agentic loop — calls Claude with tools, executes results, streams events |
| **Query Maker** | `agents/query_maker.py` | Generates DuckDB SQL from natural language intent |
| **Prompt Polisher** | `agents/prompt_polisher.py` | Validates, classifies, and refines user prompts |
| **Query Executor** | `services/query_executor.py` | Executes SQL via DuckDB on pandas DataFrames |
| **Session Manager** | `services/session_manager.py` | Per-session data files, chat history, plot metadata |
| **Metrics Evaluator** | `services/metrics_evaluator.py` | Runtime quality metrics (valid_answer, hallucination, unsafe_code) |
| **LLM Judge** | `services/llm_judge.py` | LLM-as-a-Judge for response quality evaluation |
| **Anthropic LLM** | `llm/anthropic_llm.py` | Claude API wrapper with tool-use support |
| **Mock LLM** | `llm/mock_llm.py` | Testing without API key |
| **API Routes** | `api/routes.py` | All FastAPI endpoints |
| **Config** | `config.py` | Pydantic settings — API key, model, CORS |

### Frontend

| Component | File | Description |
|-----------|------|-------------|
| **App** | `src/App.tsx` | Main app — chat, SSE, file upload, state management |
| **DataTab** | `src/components/DataTab.tsx` | Data table with sort, filter, search, version switching, CSV export |
| **PlotsTab** | `src/components/PlotsTab.tsx` | Plot gallery with view, code copy, PNG download |
| **Chart** | `src/components/Chart.tsx` | Recharts wrapper for all chart types with customization |
| **MarkdownLatex** | `src/components/MarkdownLatex.tsx` | Markdown + LaTeX renderer for chat messages |

---

## Tech Stack

**Backend:**
- Python 3.11+
- FastAPI + Uvicorn
- Anthropic Claude API (claude-haiku-4-5 default)
- DuckDB for SQL query execution
- Pandas + NumPy for data handling
- Matplotlib + Seaborn for code snippet generation
- Pydantic v2 for validation

**Frontend:**
- React 18 + TypeScript
- Vite 6
- Recharts for charts
- Tailwind CSS + Radix UI for styling
- KaTeX for math rendering
- Lucide React for icons
- html2canvas for PNG export

---

## Quick Start

### 1. Backend

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure API Key

Create a `.env` file in the **root** directory:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

Optional settings:

```env
CLASSIFIER_MODEL=claude-haiku-4-5-20251001   # LLM model
JUDGE_ENABLED=true                            # LLM Judge quality evaluation
USE_MOCK_LLM=true                             # Test without API key
```

### 3. Run Backend

```bash
python -m backend.main
```

Backend runs at **http://localhost:8001**

### 4. Run Frontend

```bash
cd frontend
npm install
npx vite --port 3001
```

Frontend runs at **http://localhost:3001**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session` | Create a new session |
| `GET` | `/api/session/{id}` | Get session status |
| `POST` | `/api/upload/{id}` | Upload CSV/Parquet file |
| `GET` | `/api/summary/{id}` | Get data summary |
| `GET` | `/api/suggestions/{id}` | Get AI prompt suggestions |
| `GET` | `/api/preview/{id}` | Get data preview (paginated) |
| `POST` | `/api/chat` | Main chat endpoint (SSE streaming) |
| `GET` | `/api/chat/{id}/history` | Get chat history |
| `GET` | `/api/plots/{id}` | Get all generated plots |
| `POST` | `/api/reset/{id}` | Reset data to original |
| `GET` | `/api/health` | Health check |

---

## How It Works

1. **Upload** — user uploads a CSV or Parquet file, creating a session
2. **Auto-analysis** — AI performs a concise first-look analysis (overview, stats, quality, insights)
3. **Chat** — user asks questions in natural language
4. **Prompt Polisher** — validates and refines the prompt, classifies intent
5. **Planner Agent** — receives the polished prompt with data context and available tools
6. **Tool loop** — agent decides which tools to call:
   - `write_to_chat(text)` — sends a message (streamed via SSE)
   - `generate_query(intent)` — generates and executes DuckDB SQL
   - `create_plot(...)` — creates a chart rendered by the frontend
   - `finish()` — ends the turn
7. **Quality evaluation** — MetricsEvaluator checks results at runtime, LLM Judge scores the response
8. **Streaming** — all events streamed to frontend via SSE in real-time

---

## Security

- **DuckDB SQL only** — no arbitrary code execution; only SELECT/WITH statements allowed
- **SQL safety** — DDL/DML statements (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE) are blocked
- **Session isolation** — each session has its own data directory under `data/sessions/`
- **Input validation** — Pydantic models validate all API inputs
- **No auto-deletion** — data is never modified or deleted without explicit user request
