"""
Planner Agent - main orchestrator that handles user requests using tool-use.

Responsibilities:
1. Receives user messages and data context
2. Decides what actions to take (query, plot, respond)
3. Delegates code generation to QueryMaker
4. Executes code via QueryExecutor
5. Streams events to frontend
"""
import os
import uuid
from typing import AsyncGenerator, Optional, TYPE_CHECKING
from pathlib import Path
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from backend.llm.anthropic_llm import AnthropicLLM, PLANNER_TOOLS
from backend.agents.query_maker import QueryMaker
from backend.agents.data_summarizer import DataSummarizer
from backend.services.query_executor import QueryExecutor
from backend.models.planner_models import ChatEvent, ToolCall, PlotInfo

if TYPE_CHECKING:
    from backend.services.session_manager import SessionManager


class PlannerAgent:
    """
    Main orchestrator agent that handles user requests using tool-use.

    The planner receives user requests along with data context and decides
    what actions to take (query, plot, respond) until calling finish().
    """
    MAX_ITERATIONS = 10  # Prevent infinite loops

    def __init__(
        self,
        llm: AnthropicLLM,
        query_maker: QueryMaker,
        query_executor: QueryExecutor,
        data_summarizer: DataSummarizer,
        plots_dir: str = "data/plots"
    ):
        self.llm = llm
        self.query_maker = query_maker
        self.query_executor = query_executor
        self.data_summarizer = data_summarizer
        self.plots_dir = plots_dir
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        """Load system prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "planner_system.txt"
        try:
            return prompt_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            return self._default_system_prompt()

    def _default_system_prompt(self) -> str:
        return """You are a data analysis assistant that helps users explore CSV datasets.

You have access to these tools:

1. **write_to_chat(text)** - Send messages to the user
2. **generate_query(intent)** - Run pandas operations on the data
3. **create_plot(plot_type, title, ...)** - Generate visualizations
4. **finish()** - End the current turn (REQUIRED when done)

Guidelines:
- Always call finish() when done
- Use write_to_chat for all user-facing output
- Be concise but informative
- Handle errors gracefully"""

    def _build_data_context(self, df: pd.DataFrame, filename: str) -> str:
        """Build efficient data context for the planner."""
        lines = []

        lines.append(f"Dataset: {filename}")
        lines.append(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        lines.append("")

        lines.append("Columns:")
        for col in df.columns:
            dtype = str(df[col].dtype)
            if pd.api.types.is_numeric_dtype(df[col]):
                min_val, max_val = df[col].min(), df[col].max()
                lines.append(f"  - {col} ({dtype}): [{min_val} to {max_val}]")
            elif df[col].nunique() <= 10:
                cats = list(df[col].dropna().unique()[:5])
                lines.append(f"  - {col} ({dtype}): {cats}")
            else:
                sample = str(df[col].dropna().iloc[0])[:30] if len(df[col].dropna()) > 0 else "N/A"
                lines.append(f"  - {col} ({dtype}): e.g. \"{sample}\"")

        numeric_cols = df.select_dtypes(include=['number']).columns[:5]
        if len(numeric_cols) > 0:
            lines.append("")
            lines.append("Quick stats:")
            for col in numeric_cols:
                mean = df[col].mean()
                lines.append(f"  - {col}: mean={mean:.2f}")

        return "\n".join(lines)

    async def run(
        self,
        user_message: str,
        df: pd.DataFrame,
        filename: str,
        session_id: str,
        session_mgr: Optional["SessionManager"] = None,
    ) -> AsyncGenerator[ChatEvent, None]:
        """
        Run the planner agent loop.

        Yields ChatEvent objects as the agent processes the request.
        """
        # State for this run
        current_df = df.copy()
        chat_messages: list[str] = []
        plots: list[PlotInfo] = []
        finished = False
        data_updated = False

        # Build initial context
        data_context = self._build_data_context(current_df, filename)

        # Initialize messages
        messages = [{
            "role": "user",
            "content": f"""DATA CONTEXT:
{data_context}

USER REQUEST:
{user_message}

Use the available tools to fulfill this request. Always call finish() when done."""
        }]

        iteration = 0

        while iteration < self.MAX_ITERATIONS and not finished:
            iteration += 1

            # Call LLM with tools
            try:
                response = await self.llm.generate_with_tools(
                    messages=messages,
                    tools=PLANNER_TOOLS,
                    system=self.system_prompt,
                )
            except Exception as e:
                yield ChatEvent(
                    event_type="error",
                    data={"message": f"LLM error: {str(e)}"}
                )
                break

            # Process response content blocks
            assistant_content = []
            tool_calls = []

            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})

                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })
                    tool_calls.append(ToolCall(
                        id=block.id,
                        name=block.name,
                        input=block.input
                    ))

            # Add assistant message to history
            messages.append({
                "role": "assistant",
                "content": assistant_content
            })

            # Process tool calls
            if tool_calls:
                tool_results = []

                for tool_call in tool_calls:
                    # Execute tool
                    result = await self._execute_tool(
                        name=tool_call.name,
                        input=tool_call.input,
                        df=current_df,
                        session_id=session_id,
                        session_mgr=session_mgr,
                        chat_messages=chat_messages,
                        plots=plots,
                    )

                    # Update state based on result
                    if result.get("new_df") is not None:
                        current_df = result["new_df"]
                        data_updated = True
                        # Persist transformed dataframe to session
                        if session_mgr:
                            session_mgr.save_transformed_dataframe(session_id, current_df)

                    if result.get("finished"):
                        finished = True

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "content": result["content"],
                        "is_error": result.get("is_error", False)
                    })

                    # Yield events based on tool type
                    if tool_call.name == "write_to_chat":
                        yield ChatEvent(
                            event_type="text",
                            data={"text": tool_call.input.get("text", "")}
                        )
                    elif tool_call.name == "generate_query":
                        yield ChatEvent(
                            event_type="query_result",
                            data={
                                "intent": tool_call.input.get("intent"),
                                "result": result["content"],
                                "is_error": result.get("is_error", False)
                            }
                        )
                        # Auto-notify user about data transformations
                        if result.get("transformation_summary"):
                            yield ChatEvent(
                                event_type="text",
                                data={"text": result["transformation_summary"]}
                            )
                    elif tool_call.name == "create_plot":
                        if not result.get("is_error") and result.get("plot_info"):
                            plot = result["plot_info"]
                            yield ChatEvent(
                                event_type="plot",
                                data={
                                    "id": plot.id,
                                    "title": plot.title,
                                    "path": plot.path,
                                    "columns_used": plot.columns_used,
                                    "summary": plot.summary,
                                }
                            )
                        elif result.get("is_error"):
                            yield ChatEvent(
                                event_type="error",
                                data={"message": result["content"]}
                            )

                # Add tool results to messages
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

            # Check for stop condition
            if response.stop_reason == "end_turn" and not tool_calls:
                break

        # Yield done event
        yield ChatEvent(
            event_type="done",
            data={
                "iterations": iteration,
                "messages_sent": len(chat_messages),
                "plots_created": len(plots),
                "data_updated": data_updated,
                "new_df": current_df if data_updated else None,
            }
        )

    async def _execute_tool(
        self,
        name: str,
        input: dict,
        df: pd.DataFrame,
        session_id: str,
        session_mgr: Optional["SessionManager"],
        chat_messages: list[str],
        plots: list[PlotInfo],
    ) -> dict:
        """Execute a tool and return the result."""

        if name == "write_to_chat":
            return await self._handle_write_to_chat(
                input, session_id, session_mgr, chat_messages
            )
        elif name == "generate_query":
            return await self._handle_generate_query(input, df)
        elif name == "create_plot":
            return await self._handle_create_plot(
                input, df, session_id, session_mgr, plots
            )
        elif name == "finish":
            return {"content": "Turn completed.", "finished": True}
        else:
            return {"content": f"Unknown tool: {name}", "is_error": True}

    async def _handle_write_to_chat(
        self,
        input: dict,
        session_id: str,
        session_mgr: Optional["SessionManager"],
        chat_messages: list[str],
    ) -> dict:
        """Send text to user."""
        text = input.get("text", "")
        chat_messages.append(text)

        if session_mgr:
            session_mgr.add_chat_message(session_id, "assistant", text)

        return {"content": "Message sent to user."}

    async def _handle_generate_query(self, input: dict, df: pd.DataFrame) -> dict:
        """Generate and execute a pandas query via QueryMaker.

        The Planner validates results through its tool-use loop - if the result
        doesn't match the intent, it can call generate_query again.
        """
        intent = input.get("intent", "")

        # Get data summary for context
        data_summary = self.data_summarizer.summarize_for_query(df)

        # Delegate to QueryMaker
        generated = await self.query_maker.generate_query(intent, data_summary)

        # Execute code
        result = self.query_executor.execute(generated.code, df)

        if result.success:
            response = {
                "content": (
                    f"Query executed successfully.\n"
                    f"Code: {generated.code}\n"
                    f"Explanation: {generated.explanation}\n"
                    f"Result: {result.result_preview}"
                )
            }

            # If transformation, return new df with detailed change info
            if result.result_type == "dataframe":
                new_df = result.result
                response["new_df"] = new_df

                # Build detailed data change summary
                old_shape = df.shape
                new_shape = new_df.shape
                old_cols = set(df.columns)
                new_cols = set(new_df.columns)

                added_cols = new_cols - old_cols
                removed_cols = old_cols - new_cols

                change_info = []
                change_info.append(f"Data shape: {old_shape[0]}×{old_shape[1]} → {new_shape[0]}×{new_shape[1]}")

                if removed_cols:
                    change_info.append(f"Removed columns: {', '.join(removed_cols)}")
                if added_cols:
                    change_info.append(f"Added columns: {', '.join(added_cols)}")
                if new_shape[0] != old_shape[0]:
                    change_info.append(f"Rows changed: {old_shape[0]} → {new_shape[0]}")

                change_info.append(f"Current columns: {', '.join(new_df.columns.tolist())}")

                response["content"] += f"\n\nDATA CHANGES:\n" + "\n".join(change_info)

                # Build user-friendly transformation summary
                summary_parts = ["✅ **Дані оновлено**"]
                if removed_cols:
                    summary_parts.append(f"Видалено: {', '.join(removed_cols)}")
                if added_cols:
                    summary_parts.append(f"Додано: {', '.join(added_cols)}")
                if new_shape[0] != old_shape[0]:
                    diff = new_shape[0] - old_shape[0]
                    if diff > 0:
                        summary_parts.append(f"+{diff} рядків")
                    else:
                        summary_parts.append(f"{diff} рядків")
                summary_parts.append(f"📊 {new_shape[0]} рядків × {new_shape[1]} колонок")
                response["transformation_summary"] = " | ".join(summary_parts)

            return response
        else:
            return {
                "content": f"Query failed: {result.error}",
                "is_error": True
            }

    async def _handle_create_plot(
        self,
        input: dict,
        df: pd.DataFrame,
        session_id: str,
        session_mgr: Optional["SessionManager"],
        plots: list[PlotInfo],
    ) -> dict:
        """Create a plot by delegating code generation to QueryMaker."""
        plot_type = input.get("plot_type", "bar")
        title = input.get("title", "Plot")

        try:
            # Get data summary for context
            data_summary = self.data_summarizer.summarize_for_query(df)

            # Delegate code generation to QueryMaker
            generated = await self.query_maker.generate_plot_code(
                plot_type=plot_type,
                data_summary=data_summary,
                title=title,
                x_column=input.get("x_column"),
                y_column=input.get("y_column"),
                color_column=input.get("color_column"),
                aggregation=input.get("aggregation"),
                custom_instructions=input.get("instructions"),
            )

            # Execute the generated plot code
            result = self.query_executor.execute(generated.code, df)

            if result.success and result.result_type == "figure":
                # Save figure as SVG
                plot_id = str(uuid.uuid4())[:8]
                plot_dir = os.path.join(self.plots_dir, session_id)
                os.makedirs(plot_dir, exist_ok=True)
                plot_path = os.path.join(plot_dir, f"{plot_id}.svg")

                result.result.savefig(plot_path, format='svg', bbox_inches='tight')
                plt.close(result.result)

                plot_info = PlotInfo(
                    id=plot_id,
                    path=plot_path,
                    title=generated.title,
                    columns_used=", ".join(generated.columns_used),
                    summary=generated.summary,
                )
                plots.append(plot_info)

                # Persist to session
                if session_mgr:
                    session_mgr.add_plot(session_id, plot_info.model_dump())
                    # Also save as chat message with plot path
                    session_mgr.add_chat_message(
                        session_id=session_id,
                        role="system",
                        text=f"📊 {generated.title}",
                        message_type="plot",
                        plot_path=plot_path,
                        plot_title=generated.title,
                    )

                return {
                    "content": (
                        f"Plot created: {generated.title}\n"
                        f"Type: {plot_type}\n"
                        f"Columns: {', '.join(generated.columns_used)}\n"
                        f"Summary: {generated.summary}"
                    ),
                    "plot_info": plot_info,
                }
            else:
                return {
                    "content": f"Plot creation failed: {result.error or 'No figure generated'}\nGenerated code:\n{generated.code}",
                    "is_error": True
                }

        except Exception as e:
            return {
                "content": f"Plot creation error: {str(e)}",
                "is_error": True
            }
