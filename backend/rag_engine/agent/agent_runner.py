"""
Agent Runner — Core orchestrator for the Electron Gate AI Agent.

Flow for each user query:
  1. TOOL SELECTION  — LLM with tool schemas picks which tool(s) to call
  2. TOOL EXECUTION  — Python functions query the DB / RAG pipeline
  3. SELF-GRADING    — LLM evaluates if the collected data is sufficient
                       If NEEDS_MORE_INFO → retry one additional tool call (max 2 rounds)
  4. FINAL SYNTHESIS — LLM produces a clear, well-formatted answer for the user

Key design principles:
- All tool calls are read-only (no DB writes).
- Role-based access: tools filtered by user role before being offered to LLM.
- Conversation history is passed as context for multi-turn coherence.
- Self-grading is a lightweight second prompt (not a second LLM call to a different model).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from sqlalchemy.orm import Session

from rag_engine.agent.tool_registry import get_tool_schemas_for_role, is_tool_allowed
from rag_engine.agent.tools.product_tools import (
    search_products,
    get_product_detail,
    recommend_products,
    get_categories,
)
from rag_engine.agent.tools.inventory_tools import check_stock, get_low_stock_products
from rag_engine.agent.tools.order_tools import get_my_orders, get_order_detail
from rag_engine.agent.tools.rag_doc_tool import search_knowledge_base

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AgentContext:
    """Everything the agent needs to process one request."""
    query: str
    user_id: str
    user_role: str
    db: Session
    llm: Any                            # LangChain ChatOpenAI instance
    embeddings: Any                     # LangChain OpenAIEmbeddings
    supabase_client: Any                # Supabase Client
    document_ids: list[str] | None = None   # Optional doc scope for RAG tool
    conversation_history: list[dict] | None = None  # [{role: "user"|"assistant", content: "..."}]


@dataclass
class AgentResponse:
    query: str
    answer: str
    tools_used: list[str] = field(default_factory=list)
    reasoning: str = ""                 # Self-grading trace (for debugging / transparency)
    sources: list[dict] = field(default_factory=list)   # From RAG tool if used


# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------

def _execute_tool(
    tool_name: str,
    tool_args: dict[str, Any],
    ctx: AgentContext,
) -> dict[str, Any]:
    """
    Dispatch a tool call to the corresponding Python function.

    Injects db, llm, embeddings, supabase_client, user_id, and user_role
    from AgentContext — these are never exposed to the LLM.
    """
    try:
        if tool_name == "search_products":
            return search_products(db=ctx.db, **tool_args)

        elif tool_name == "get_product_detail":
            return get_product_detail(db=ctx.db, **tool_args)

        elif tool_name == "recommend_products":
            return recommend_products(db=ctx.db, **tool_args)

        elif tool_name == "get_categories":
            return get_categories(db=ctx.db)

        elif tool_name == "check_stock":
            return check_stock(db=ctx.db, user_role=ctx.user_role, **tool_args)

        elif tool_name == "get_low_stock_products":
            if not is_tool_allowed(tool_name, ctx.user_role):
                return {"error": "Access denied: this tool requires Staff or Admin role."}
            return get_low_stock_products(db=ctx.db, **tool_args)

        elif tool_name == "get_my_orders":
            return get_my_orders(
                db=ctx.db,
                user_id=ctx.user_id,
                user_role=ctx.user_role,
                **tool_args,
            )

        elif tool_name == "get_order_detail":
            return get_order_detail(
                db=ctx.db,
                user_id=ctx.user_id,
                user_role=ctx.user_role,
                **tool_args,
            )

        elif tool_name == "search_knowledge_base":
            return search_knowledge_base(
                db=ctx.db,
                llm=ctx.llm,
                embeddings=ctx.embeddings,
                supabase_client=ctx.supabase_client,
                user_id=ctx.user_id,
                user_role=ctx.user_role,
                document_ids=ctx.document_ids,
                **tool_args,
            )

        else:
            return {"error": f"Unknown tool: {tool_name}"}

    except TypeError as exc:
        logger.warning("Tool %s called with invalid args %s: %s", tool_name, tool_args, exc)
        return {"error": f"Invalid arguments for tool {tool_name}: {exc}"}
    except Exception as exc:
        logger.exception("Tool %s raised an unexpected error", tool_name)
        return {"error": f"Tool {tool_name} failed: {exc}"}


# ---------------------------------------------------------------------------
# Self-grading
# ---------------------------------------------------------------------------

_GRADING_SYSTEM = """\
You are a quality-control checker for an AI shopping assistant.

Given the original user question and the data retrieved from tools, \
evaluate whether the available data is sufficient to answer the question well.

Respond with EXACTLY one of:
  SUFFICIENT        — The data answers the question; proceed to final answer.
  NEEDS_MORE_INFO   — A specific additional tool call would noticeably improve the answer. \
State which tool and why in one sentence.
  CANNOT_ANSWER     — The question cannot be answered with the available tools or data.

Be concise. Do not write long explanations."""


def _self_grade(
    llm,
    query: str,
    tool_results: dict[str, Any],
) -> tuple[str, str]:
    """
    Ask the LLM to grade whether collected tool results are sufficient.

    Returns:
        (verdict, explanation) where verdict is one of
        "SUFFICIENT", "NEEDS_MORE_INFO", "CANNOT_ANSWER".
    """
    results_text = json.dumps(tool_results, ensure_ascii=False, default=str, indent=2)
    prompt = (
        f"User question: {query}\n\n"
        f"Retrieved data:\n{results_text}\n\n"
        "Is this sufficient to answer the question?"
    )
    try:
        response = llm.invoke([
            SystemMessage(content=_GRADING_SYSTEM),
            HumanMessage(content=prompt),
        ])
        text: str = response.content if hasattr(response, "content") else str(response)
        text = text.strip()

        if "NEEDS_MORE_INFO" in text:
            return "NEEDS_MORE_INFO", text
        if "CANNOT_ANSWER" in text:
            return "CANNOT_ANSWER", text
        return "SUFFICIENT", text

    except Exception as exc:
        logger.warning("Self-grading failed: %s — proceeding as SUFFICIENT", exc)
        return "SUFFICIENT", f"Grading skipped: {exc}"


# ---------------------------------------------------------------------------
# Final synthesis
# ---------------------------------------------------------------------------

_SYNTHESIS_SYSTEM = """\
You are a helpful, knowledgeable assistant for Electron Gate, a premium electronics \
e-commerce store.

Answer the user's question using ONLY the data provided. Be concise and clear.
Format prices as USD with two decimal places. Use markdown bullet lists when listing \
multiple products or items. If data is unavailable, say so politely.

Do NOT make up product names, prices, stock quantities, or order details."""


def _synthesize_answer(
    llm,
    query: str,
    tool_results: dict[str, Any],
    conversation_history: list[dict] | None,
) -> str:
    """Build the final user-facing answer from accumulated tool results."""
    results_text = json.dumps(tool_results, ensure_ascii=False, default=str, indent=2)

    messages: list[BaseMessage] = [SystemMessage(content=_SYNTHESIS_SYSTEM)]

    # Inject recent conversation history (last 6 turns for context window economy)
    if conversation_history:
        for turn in conversation_history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))

    messages.append(
        HumanMessage(
            content=(
                f"User question: {query}\n\n"
                f"Data from the system:\n{results_text}\n\n"
                "Please answer the question based on this data."
            )
        )
    )

    try:
        response = llm.invoke(messages)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.exception("Final synthesis failed")
        return f"Sorry, I encountered an error while generating the answer: {exc}"


# ---------------------------------------------------------------------------
# Main Agent Runner
# ---------------------------------------------------------------------------

MAX_TOOL_ROUNDS = 2  # Maximum rounds of tool calling before forcing synthesis


def run_agent(ctx: AgentContext) -> AgentResponse:
    """
    Execute the full agent pipeline synchronously.

    Steps:
      1. Bind role-appropriate tools to the LLM.
      2. LLM selects and calls tools (up to MAX_TOOL_ROUNDS rounds).
      3. Self-grade: if NEEDS_MORE_INFO and rounds remain, do one more round.
      4. Synthesize final answer.

    Args:
        ctx: AgentContext containing query, user info, and all dependencies.

    Returns:
        AgentResponse with answer, tools_used, reasoning, and sources.
    """
    tool_schemas = get_tool_schemas_for_role(ctx.user_role)
    llm_with_tools = ctx.llm.bind_tools(tool_schemas) if tool_schemas else ctx.llm

    accumulated_results: dict[str, Any] = {}
    tools_used: list[str] = []
    rag_sources: list[dict] = []
    reasoning_trace: list[str] = []

    # Build initial message list (history + current query)
    messages: list[BaseMessage] = [
        SystemMessage(
            content=(
                "You are a helpful assistant for an electronics store. "
                "Use the available tools to gather information before answering. "
                "Call only the tools needed to answer the question."
            )
        )
    ]
    if ctx.conversation_history:
        for turn in ctx.conversation_history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=ctx.query))

    # ---- Tool-calling loop ------------------------------------------------
    for round_num in range(MAX_TOOL_ROUNDS):
        try:
            response = llm_with_tools.invoke(messages)
        except Exception as exc:
            logger.exception("LLM invocation failed in round %d", round_num)
            reasoning_trace.append(f"Round {round_num+1}: LLM error — {exc}")
            break

        # If no tool calls, LLM decided to answer directly — exit loop
        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            reasoning_trace.append(f"Round {round_num+1}: LLM made no tool calls.")
            break

        # Execute all tool calls in this round
        round_results: dict[str, Any] = {}
        for tc in tool_calls:
            name: str = tc.get("name") or tc.get("function", {}).get("name", "")
            raw_args = tc.get("args") or tc.get("function", {}).get("arguments", {})
            args: dict = raw_args if isinstance(raw_args, dict) else json.loads(raw_args or "{}")

            if not name:
                continue

            result = _execute_tool(name, args, ctx)
            round_results[name] = result
            if name not in tools_used:
                tools_used.append(name)

            # Collect RAG sources if knowledge_base was called
            if name == "search_knowledge_base" and isinstance(result, dict):
                rag_sources.extend(result.get("sources", []))

        accumulated_results.update(round_results)
        reasoning_trace.append(
            f"Round {round_num+1}: called {list(round_results.keys())}"
        )

        # Add the assistant tool_calls message and tool results to context
        messages.append(response)
        for tc in tool_calls:
            name = tc.get("name") or tc.get("function", {}).get("name", "")
            tool_result_text = json.dumps(
                round_results.get(name, {}), ensure_ascii=False, default=str
            )
            from langchain_core.messages import ToolMessage
            messages.append(
                ToolMessage(
                    content=tool_result_text,
                    tool_call_id=tc.get("id", name),
                )
            )

        # Self-grade after the first round (only if more rounds remain)
        if round_num < MAX_TOOL_ROUNDS - 1:
            verdict, explanation = _self_grade(ctx.llm, ctx.query, accumulated_results)
            reasoning_trace.append(f"Self-grade: {verdict} — {explanation}")
            if verdict in ("SUFFICIENT", "CANNOT_ANSWER"):
                break
            # NEEDS_MORE_INFO → continue to next round

    # ---- Final synthesis --------------------------------------------------
    if not accumulated_results:
        # LLM chose to answer without any tool calls — synthesize directly
        try:
            direct_response = ctx.llm.invoke(messages)
            answer = (
                direct_response.content
                if hasattr(direct_response, "content")
                else str(direct_response)
            )
        except Exception as exc:
            answer = f"Sorry, I encountered an error: {exc}"
    else:
        answer = _synthesize_answer(
            ctx.llm, ctx.query, accumulated_results, ctx.conversation_history
        )

    return AgentResponse(
        query=ctx.query,
        answer=answer,
        tools_used=tools_used,
        reasoning="\n".join(reasoning_trace),
        sources=rag_sources,
    )
