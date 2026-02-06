from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum


class ToolName(str, Enum):
    WRITE_TO_CHAT = "write_to_chat"
    GENERATE_QUERY = "generate_query"
    CREATE_PLOT = "create_plot"
    FINISH = "finish"


class ToolCall(BaseModel):
    """Represents a tool call from the LLM."""
    id: str
    name: ToolName
    input: dict[str, Any]


class ToolResult(BaseModel):
    """Result of executing a tool."""
    tool_use_id: str
    content: str
    is_error: bool = False


class ChatEvent(BaseModel):
    """Event sent to frontend via SSE."""
    event_type: str  # "text", "query_result", "plot", "error", "done"
    data: dict[str, Any]


class PlotConfig(BaseModel):
    """Configuration for creating a plot."""
    plot_type: str
    title: str
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    aggregation: Optional[str] = None


class PlotInfo(BaseModel):
    """Information about a created plot."""
    id: str
    path: str
    title: str
    columns_used: str
    summary: Optional[str] = None
    insights: Optional[str] = None
    chart_data: Optional[list[dict]] = None


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    session_id: str
    message: str
    stream: bool = True


class ChatResponse(BaseModel):
    """Response for non-streaming chat."""
    messages: list[str]
    plots: list[dict]  # list of PlotInfo.model_dump()
    data_updated: bool = False
