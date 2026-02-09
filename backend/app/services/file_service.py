import os
import shutil
from pathlib import Path
from typing import Any

import duckdb

from backend.app.config import settings

ALLOWED_EXTENSIONS = {".csv", ".parquet", ".pq"}


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def validate_extension(filename: str) -> None:
    ext = get_file_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format: {ext}. Allowed: .csv, .parquet, .pq")


def save_upload(session_id: str, filename: str, content: bytes) -> str:
    """Save uploaded file to data/{session_id}/original.{ext}. Returns path on disk."""
    ext = get_file_extension(filename)
    session_dir = os.path.join(settings.DATA_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    file_path = os.path.join(session_dir, f"original{ext}")
    with open(file_path, "wb") as f:
        f.write(content)

    return file_path


def cleanup_session_dir(session_id: str) -> None:
    """Remove session data directory if it exists."""
    session_dir = os.path.join(settings.DATA_DIR, session_id)
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)


def validate_and_preview(file_path: str) -> dict[str, Any]:
    """
    Open file with DuckDB, validate it, and return metadata + 500-row preview.

    Returns:
        {
            "row_count": int,
            "column_count": int,
            "columns": list[str],
            "preview": list[dict[str, Any]]
        }

    Raises ValueError on validation failure.
    """
    abs_path = os.path.abspath(file_path)
    ext = get_file_extension(file_path)
    if ext == ".csv":
        read_fn = f"read_csv_auto('{abs_path}')"
    elif ext in (".parquet", ".pq"):
        read_fn = f"read_parquet('{abs_path}')"
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    conn = duckdb.connect()
    try:
        # Get row count
        row_count = conn.execute(f"SELECT COUNT(*) FROM {read_fn}").fetchone()[0]
        if row_count == 0:
            raise ValueError("File contains no data rows")

        # Get columns
        describe = conn.execute(f"DESCRIBE SELECT * FROM {read_fn}").fetchall()
        columns = [row[0] for row in describe]
        column_count = len(columns)
        if column_count == 0:
            raise ValueError("File contains no columns")

        # Get preview (up to 500 rows)
        preview_result = conn.execute(f"SELECT * FROM {read_fn} LIMIT 500")
        col_names = [desc[0] for desc in preview_result.description]
        rows = preview_result.fetchall()

        preview = []
        for row in rows:
            row_dict: dict[str, Any] = {}
            for i, val in enumerate(row):
                if val is None:
                    row_dict[col_names[i]] = None
                else:
                    row_dict[col_names[i]] = val
            preview.append(row_dict)

        return {
            "row_count": row_count,
            "column_count": column_count,
            "columns": columns,
            "preview": preview,
        }
    except duckdb.Error as e:
        raise ValueError(f"Could not parse file: {e}")
    finally:
        conn.close()
