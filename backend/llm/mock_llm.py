import re
from typing import Any
from .base import BaseLLM


class MockLLM(BaseLLM):
    """
    Mock LLM for testing without API keys.
    Uses simple keyword matching to simulate classification.
    Replace with real LLM when API keys are available.
    """

    # Keywords that suggest each type
    PLOT_KEYWORDS = [
        "plot", "chart", "graph", "visualize", "visualization", "show me",
        "distribution", "histogram", "bar chart", "pie chart", "scatter",
        "trend", "over time", "compare", "correlation", "діаграма", "графік",
        "покажи", "візуалізуй"
    ]

    TRANSFORMATION_KEYWORDS = [
        "filter", "remove", "delete", "drop", "keep only", "where",
        "group by", "aggregate", "sum", "average", "merge", "join",
        "create column", "new column", "rename", "sort", "order by",
        "фільтр", "видали", "залиш", "згрупуй", "сортуй", "додай колонку"
    ]

    QUESTION_KEYWORDS = [
        "what", "how many", "which", "who", "when", "why", "is there",
        "count", "average", "mean", "max", "min", "total", "summarize",
        "explain", "describe", "що", "скільки", "який", "хто", "коли",
        "порахуй", "опиши"
    ]

    async def generate(self, prompt: str, system: str = None) -> str:
        """Generate a mock response."""
        return "Mock response"

    async def generate_json(self, prompt: str, system: str = None) -> dict[str, Any]:
        """
        Classify based on keyword matching.
        This is a placeholder - replace with real LLM for production.
        """
        text = prompt.lower()

        # Check for plot keywords
        plot_score = sum(1 for kw in self.PLOT_KEYWORDS if kw in text)
        transform_score = sum(1 for kw in self.TRANSFORMATION_KEYWORDS if kw in text)
        question_score = sum(1 for kw in self.QUESTION_KEYWORDS if kw in text)

        # Determine type based on scores
        if plot_score > transform_score and plot_score > 0:
            return {
                "request_type": "question_plot",
                "confidence": min(0.5 + plot_score * 0.1, 0.85),
                "reasoning": f"[MOCK] Detected plot-related keywords. Found {plot_score} matches."
            }
        elif transform_score > question_score and transform_score > 0:
            return {
                "request_type": "transformation",
                "confidence": min(0.5 + transform_score * 0.1, 0.85),
                "reasoning": f"[MOCK] Detected transformation keywords. Found {transform_score} matches."
            }
        elif question_score > 0:
            return {
                "request_type": "question_text",
                "confidence": min(0.5 + question_score * 0.1, 0.85),
                "reasoning": f"[MOCK] Detected question keywords. Found {question_score} matches."
            }
        else:
            # Default to question_text for unrecognized input
            return {
                "request_type": "question_text",
                "confidence": 0.4,
                "reasoning": "[MOCK] No specific keywords detected. Defaulting to text question."
            }
