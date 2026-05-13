from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal, Tuple
import pandas as pd

router = APIRouter(prefix="/api/join", tags=["join"])


class JoinPreviewRequest(BaseModel):
    left_data: List[Dict[str, Any]]
    right_data: List[Dict[str, Any]]
    how: Literal['inner', 'left', 'right', 'outer', 'cross'] = 'inner'
    left_on: List[str]
    right_on: List[str]
    suffixes: Tuple[str, str] = ('_x', '_y')


class JoinPreviewResponse(BaseModel):
    rows: List[Dict[str, Any]]
    columns: List[str]
    total_rows: int
    message: Optional[str] = None


@router.post("/preview", response_model=JoinPreviewResponse)
async def join_preview(request: JoinPreviewRequest):
    # Truncate to 1000 rows per side
    left_data = request.left_data[:1000]
    right_data = request.right_data[:1000]

    left_df = pd.DataFrame(left_data)
    right_df = pd.DataFrame(right_data)

    # Validate keys exist
    for col in request.left_on:
        if col not in left_df.columns:
            raise HTTPException(
                status_code=422,
                detail=f"Column '{col}' not found in left DataFrame",
            )
    for col in request.right_on:
        if col not in right_df.columns:
            raise HTTPException(
                status_code=422,
                detail=f"Column '{col}' not found in right DataFrame",
            )

    # Perform merge
    if request.how == 'cross':
        result = pd.merge(left_df, right_df, how='cross', suffixes=request.suffixes)
    else:
        result = pd.merge(
            left_df,
            right_df,
            how=request.how,
            left_on=request.left_on,
            right_on=request.right_on,
            suffixes=request.suffixes,
        )

    total_rows = len(result)
    preview_rows = result.head(10).to_dict(orient='records')
    columns = list(result.columns)

    message = None
    if total_rows == 0:
        message = "No matching rows found for the given join configuration."

    return JoinPreviewResponse(
        rows=preview_rows,
        columns=columns,
        total_rows=total_rows,
        message=message,
    )
