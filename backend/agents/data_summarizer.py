"""
Data Summarizer Agent - converts DataFrame to descriptive text/markdown for LLM context.
"""
import pandas as pd
from typing import Optional
from backend.llm.base import BaseLLM


class DataSummarizer:
    """
    Converts CSV/DataFrame to a concise markdown summary for LLM context.

    Two modes:
    1. Basic (no LLM) - just schema, stats, samples
    2. Enhanced (with LLM) - adds natural language descriptions and insights
    """

    def __init__(self, llm: Optional[BaseLLM] = None):
        self.llm = llm

    def summarize_basic(self, df: pd.DataFrame, filename: str = "data.csv") -> str:
        """
        Generate a basic markdown summary without LLM.
        Fast and token-efficient.
        """
        lines = []

        # Header
        lines.append(f"# Data Summary: {filename}")
        lines.append("")

        # Overview
        lines.append("## Overview")
        lines.append(f"- **Rows:** {len(df):,}")
        lines.append(f"- **Columns:** {len(df.columns)}")
        lines.append(f"- **Memory:** {df.memory_usage(deep=True).sum() / 1024:.1f} KB")
        lines.append("")

        # Schema
        lines.append("## Schema")
        lines.append("| Column | Type | Non-Null | Unique | Sample Values |")
        lines.append("|--------|------|----------|--------|---------------|")

        for col in df.columns:
            dtype = str(df[col].dtype)
            non_null = df[col].notna().sum()
            null_pct = (1 - non_null / len(df)) * 100 if len(df) > 0 else 0
            unique = df[col].nunique()

            # Sample values (first 3 unique, truncated)
            samples = df[col].dropna().unique()[:3]
            samples_str = ", ".join(str(s)[:20] for s in samples)
            if len(samples_str) > 40:
                samples_str = samples_str[:40] + "..."

            null_info = f"{non_null:,}" if null_pct == 0 else f"{non_null:,} ({null_pct:.0f}% null)"
            lines.append(f"| {col} | {dtype} | {null_info} | {unique:,} | {samples_str} |")

        lines.append("")

        # Numeric stats
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numeric_cols:
            lines.append("## Numeric Statistics")
            stats_df = df[numeric_cols].describe().T[['mean', 'std', 'min', 'max']]
            lines.append(stats_df.to_markdown())
            lines.append("")

        # Sample data
        lines.append("## Sample Data (first 5 rows)")
        lines.append(df.head(5).to_markdown(index=False))
        lines.append("")

        return "\n".join(lines)

    async def summarize_enhanced(
        self,
        df: pd.DataFrame,
        filename: str = "data.csv",
        user_context: str = None
    ) -> str:
        """
        Generate an enhanced summary with LLM-generated insights.
        More expensive but provides better context.
        """
        if not self.llm:
            return self.summarize_basic(df, filename)

        # Start with basic summary
        basic_summary = self.summarize_basic(df, filename)

        # Ask LLM for insights
        prompt = f"""Analyze this dataset summary and provide brief insights:

{basic_summary}

{f"User's context: {user_context}" if user_context else ""}

Provide a SHORT analysis (3-5 bullet points) covering:
1. What this data appears to represent
2. Key patterns or notable observations
3. Potential data quality issues (if any)
4. Suggested analyses or questions to explore

Keep it concise - this will be used as context for another LLM."""

        system = "You are a data analyst. Be concise and insightful."

        try:
            insights = await self.llm.generate(prompt, system)
            return f"{basic_summary}\n## AI Insights\n{insights}\n"
        except Exception as e:
            print(f"[DataSummarizer] LLM insights failed: {e}")
            return basic_summary

    def summarize_for_query(self, df: pd.DataFrame) -> str:
        """
        Generate a minimal summary optimized for query generation.
        Very token-efficient - just what's needed to write pandas code.
        """
        lines = []

        lines.append("DataFrame info:")
        lines.append(f"- Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        lines.append("")
        lines.append("Columns:")

        for col in df.columns:
            dtype = str(df[col].dtype)

            # Add range/categories for better query context
            if pd.api.types.is_numeric_dtype(df[col]):
                min_val = df[col].min()
                max_val = df[col].max()
                lines.append(f"  - {col} ({dtype}): range [{min_val} to {max_val}]")
            elif pd.api.types.is_categorical_dtype(df[col]) or df[col].nunique() <= 10:
                categories = df[col].dropna().unique().tolist()[:10]
                lines.append(f"  - {col} ({dtype}): categories {categories}")
            else:
                sample = str(df[col].dropna().iloc[0])[:30] if len(df[col].dropna()) > 0 else "N/A"
                lines.append(f"  - {col} ({dtype}): e.g. \"{sample}\"")

        return "\n".join(lines)


# Convenience function
def create_data_summarizer(llm: Optional[BaseLLM] = None) -> DataSummarizer:
    """Create a DataSummarizer instance."""
    return DataSummarizer(llm)
