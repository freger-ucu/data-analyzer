# Agent Forge - Data Analyzer

AI Agent for analyzing datasets.

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure API Key

Create `.env` file in root directory:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

### 3. Run Backend

```bash
# From root directory
python -m backend.main
```

Backend runs at: http://localhost:8000

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

## Project Structure

```
agent-forge/
├── backend/
│   ├── agents/          # AI agents (planner, query_generator, etc.)
│   ├── llm/             # LLM provider abstractions
│   ├── models/          # Pydantic schemas
│   ├── prompts/         # Prompt templates
│   ├── api/             # FastAPI routes
│   └── main.py          # Entry point
│
├── frontend/
│   └── src/
│       ├── App.tsx      # Main chat component
│       └── ...
│
└── .env                 # API keys (create this)
```

## API Endpoints

- `POST /api/chat` - Main chat endpoint (Planner Agent with tools)
- `POST /api/upload/{session_id}` - Upload CSV file
- `GET /api/preview/{session_id}` - Get data preview
- `GET /api/plots/{session_id}` - Get generated plots
- `GET /api/health` - Health check
