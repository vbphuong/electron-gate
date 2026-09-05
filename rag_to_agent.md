# RAG → Agent Upgrade: Tool-Calling AI Agent

## Overview

Upgrade the current document-only RAG pipeline thành một **AI Agent** có khả năng:
1. **Tool-Calling** — Agent tự quyết dùng tool nào để lấy data (DB query, doc RAG, hay kết hợp cả hai)
2. **Reasoning / Self-Verification** — Trước khi trả lời user, Agent tự đánh giá xem câu trả lời có hợp lý và đủ thông tin không
3. **Role-Aware** — Data trả về phân quyền theo role (User chỉ thấy public data, Staff/Admin thấy đầy đủ)
4. **Read-Only** — Tất cả tools chỉ query, không write bất cứ thứ gì vào DB

Architecture tổng thể: `User Message → Intent Router (LLM) → Tool Selection → Tool Execution → Self-Grading → Final Answer`

---

## Open Questions

> [!NOTE]
> Các câu hỏi này không block việc triển khai, nhưng ảnh hưởng đến một số chi tiết nhỏ. Tôi sẽ dùng default nếu bạn không có ý kiến khác.

1. **Model cho Agent**: Hiện tại đang dùng `gpt-4o-mini`. Agent với tool-calling + self-grading tốt hơn khi dùng `gpt-4o`. Bạn muốn dùng model nào cho Agent endpoint? *(Default: `gpt-4o-mini` để tiết kiệm cost)*

2. **Conversation Memory**: Agent có cần nhớ context của cuộc hội thoại (multi-turn) không? Hệ thống đã có bảng `Conversation` + `Message` trong DB — tôi có thể tích hợp history vào Agent. *(Default: có, dùng lịch sử chat)*

3. **Recommendation logic**: Khi user nói "recommend me something for gaming under \$500", Agent tìm theo: category + price filter + còn stock. Ngoài ra bạn muốn dùng thêm tiêu chí nào không? *(Default: category + price range + in-stock only)*

---

## Proposed Changes

### Component 1: Agent Tools — Database Query Layer

Đây là trung tâm của upgrade. Mỗi "tool" là một Python function mà LLM có thể gọi để lấy data thực từ DB.

---

#### [NEW] `backend/rag_engine/agent/tools/product_tools.py`

Chứa các tools liên quan đến product catalog:

- **`search_products(query, category, min_price, max_price, limit)`** — Full-text + filter search trên `products` + `product_variants` + `categories`. Trả về danh sách sản phẩm với tên, giá, model, màu, storage.
- **`get_product_detail(product_name_or_id)`** — Lấy thông tin chi tiết 1 sản phẩm: specs (`product_specs`, `variant_specs`), tất cả variants, giá từng variant.
- **`recommend_products(use_case, budget, preferences)`** — Tìm sản phẩm phù hợp dựa trên use-case + budget + còn hàng. Trả về top N kết quả có giải thích.
- **`get_categories()`** — Liệt kê tất cả categories để Agent biết phạm vi catalog.

---

#### [NEW] `backend/rag_engine/agent/tools/inventory_tools.py`

Chứa các tools về tồn kho:

- **`check_stock(product_name_or_variant_id)`** — Truy vấn `inventory_stock` + `inventory_locations`: số lượng available, reserved, tại warehouse nào. Role-aware: User chỉ thấy "In Stock / Out of Stock / Low Stock", Staff/Admin thấy số cụ thể và location.
- **`get_low_stock_products(threshold)`** — (Staff/Admin only) Liệt kê các variant có `qty_available < threshold`.

---

#### [NEW] `backend/rag_engine/agent/tools/order_tools.py`

Chứa tools về order — chỉ cho phép user xem order của chính mình:

- **`get_my_orders(user_id, status_filter)`** — Lấy danh sách orders của user hiện tại, kèm status và items.
- **`get_order_detail(order_number, user_id)`** — Chi tiết 1 order: items, payment status, shipment tracking. Validate `user_id` ownership (hoặc Admin/Staff bypass).

---

#### [NEW] `backend/rag_engine/agent/tools/rag_doc_tool.py`

Wrapper cho pipeline RAG hiện tại để Agent gọi như một tool:

- **`search_knowledge_base(query, document_ids)`** — Gọi lại toàn bộ pipeline retrieve + RRF + generate_final_answer hiện có. Agent dùng tool này khi câu hỏi liên quan đến tài liệu đã upload (policy, manual, specs PDF...).

---

### Component 2: Agent Core — Orchestrator

---

#### [NEW] `backend/rag_engine/agent/agent_runner.py`

**Đây là brain của Agent.**

```
Flow:
1. TOOL SELECTION  — LLM nhận user query + danh sách tools, chọn tool(s) cần gọi
2. TOOL EXECUTION  — Gọi các hàm Python tương ứng với SQLAlchemy queries
3. SELF-GRADING    — LLM thứ hai (hoặc cùng LLM với prompt khác) đánh giá:
                     - Câu trả lời có địa chỉ được câu hỏi không?
                     - Data có đủ không, hay cần gọi thêm tool?
                     - Nếu thiếu → retry với tool bổ sung (max 2 lần)
4. FINAL SYNTHESIS — Tổng hợp thành câu trả lời cuối cùng cho user
```

Key classes:
- `AgentContext` — Dataclass chứa: user query, role, user_id, conversation_history, available tools (filtered by role)
- `AgentRunner.run(context)` → `AgentResponse` — Main async entry point

**Self-Grading Prompt mẫu:**
```
You are a quality checker. Given the user's question and the retrieved data,
evaluate if the answer fully addresses the question.
Score: SUFFICIENT | NEEDS_MORE_INFO | CANNOT_ANSWER
If NEEDS_MORE_INFO, specify which additional tool to call and why.
```

---

#### [NEW] `backend/rag_engine/agent/tool_registry.py`

Quản lý danh sách tools và phân quyền:

```python
TOOL_REGISTRY = {
    "search_products":      {"fn": search_products,    "roles": ["User", "Staff", "Admin"]},
    "get_product_detail":   {"fn": get_product_detail,  "roles": ["User", "Staff", "Admin"]},
    "recommend_products":   {"fn": recommend_products,  "roles": ["User", "Staff", "Admin"]},
    "check_stock":          {"fn": check_stock,         "roles": ["User", "Staff", "Admin"]},  # role-aware output
    "get_low_stock_products": {"fn": get_low_stock,     "roles": ["Staff", "Admin"]},
    "get_my_orders":        {"fn": get_my_orders,       "roles": ["User", "Staff", "Admin"]},
    "get_order_detail":     {"fn": get_order_detail,    "roles": ["User", "Staff", "Admin"]},
    "search_knowledge_base": {"fn": search_kb,          "roles": ["User", "Staff", "Admin"]},
    "get_categories":       {"fn": get_categories,      "roles": ["User", "Staff", "Admin"]},
}

def get_tools_for_role(role: str) -> list[dict]:
    """Return OpenAI function-calling schema for tools accessible to this role."""
```

Mỗi tool được serialize thành **OpenAI tool schema** (JSON Schema format) để truyền vào `ChatOpenAI` với `bind_tools()`.

---

### Component 3: Agent API Endpoint

---

#### [MODIFY] `backend/api/routers/rag.py`

Thêm endpoint mới `/rag/agent` (giữ nguyên `/rag/query` và `/rag/search` cũ):

```python
class AgentQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None   # để load history từ DB
    document_ids: Optional[List[str]] = None  # optional scope cho RAG tool

class AgentQueryResponse(BaseModel):
    query: str
    answer: str
    tools_used: List[str]           # ["search_products", "check_stock"]
    reasoning: Optional[str]        # self-grading trace (có thể ẩn ở prod)
    sources: List[SourceChunk]      # từ RAG tool nếu có dùng

@router.post("/agent", response_model=AgentQueryResponse)
async def agent_query(request, current_user, db, llm, embeddings, supabase_client):
    ...
```

---

### Component 4: DB Session Injection vào Tools

Tools cần access DB. Giải pháp: inject `db: Session` và `current_user: dict` vào mỗi tool call thông qua `AgentContext`. Không dùng global session.

---

#### [MODIFY] `backend/api/deps.py`

Không cần thay đổi lớn. Tuy nhiên sẽ thêm optional dependency `agent_llm_dependency` dùng model mạnh hơn nếu cần (configurable qua env var `AGENT_MODEL`).

---

### Component 5: Frontend — Agent Chat UI *(optional, có thể defer)*

> [!NOTE]
> Frontend changes có thể làm sau. Backend Agent API đã có thể dùng được qua Swagger UI.

Nếu làm frontend:

#### [MODIFY] Frontend Agent Chat Component

- Hiển thị `tools_used` dưới dạng badge (e.g., `[DB: search_products]`, `[KB: knowledge_base]`)
- Hiển thị `reasoning` trace có thể toggle ẩn/hiện
- Giữ nguyên giao diện Terminal RAG Workbench hiện tại, thêm tab "Agent" bên cạnh

---

## Architecture Diagram

```
User Query
    │
    ▼
[AgentRunner]
    │
    ├─► Intent Analysis (LLM gpt-4o-mini)
    │       └─► Chọn tools từ TOOL_REGISTRY (filtered by role)
    │
    ├─► Tool Execution (parallel nếu độc lập)
    │       ├─► product_tools.py  ──► SQLAlchemy queries
    │       ├─► inventory_tools.py ──► SQLAlchemy queries
    │       ├─► order_tools.py   ──► SQLAlchemy queries (user-scoped)
    │       └─► rag_doc_tool.py  ──► Existing RAG pipeline
    │
    ├─► Self-Grading (LLM)
    │       ├─► SUFFICIENT     → proceed to synthesis
    │       └─► NEEDS_MORE_INFO → retry 1 more tool call
    │
    └─► Final Synthesis (LLM)
            └─► AgentQueryResponse → User
```

---

## Files Summary

| File | Action | Mô tả |
|---|---|---|
| `rag_engine/agent/__init__.py` | NEW | Package init |
| `rag_engine/agent/agent_runner.py` | NEW | Agent orchestrator, self-grading loop |
| `rag_engine/agent/tool_registry.py` | NEW | Tool registration + OpenAI schema builder |
| `rag_engine/agent/tools/__init__.py` | NEW | Package init |
| `rag_engine/agent/tools/product_tools.py` | NEW | search, detail, recommend |
| `rag_engine/agent/tools/inventory_tools.py` | NEW | stock check, low stock |
| `rag_engine/agent/tools/order_tools.py` | NEW | order history, order detail |
| `rag_engine/agent/tools/rag_doc_tool.py` | NEW | Wraps existing RAG pipeline |
| `api/routers/rag.py` | MODIFY | Add `/rag/agent` endpoint |
| `api/deps.py` | MODIFY | Optional: add `AGENT_MODEL` env config |
| `requirements.txt` | MODIFY | Không cần thư viện mới (dùng langchain-openai đã có) |

---

## Verification Plan

### Automated / Manual Testing

Sau khi implement, test qua Swagger UI (`/docs`) với các câu hỏi:

| Test Case | Expected Tool(s) | Expected Behavior |
|---|---|---|
| "How much does the iPhone 15 cost?" | `search_products` + `get_product_detail` | Trả giá từng variant |
| "Is the Samsung Galaxy S24 in stock?" | `search_products` + `check_stock` | User thấy "In Stock", Staff thấy số lượng |
| "Recommend me a laptop under $800" | `search_products` + `check_stock` | Top 3 laptops có giá ≤ $800 còn hàng |
| "What is the return policy?" | `search_knowledge_base` | Trả lời từ doc RAG |
| "Show me my recent orders" | `get_my_orders` | Đúng orders của user đó |
| "What gaming phones do you have?" | `get_categories` + `search_products` | Phones có trong category Gaming |
| Câu hỏi mơ hồ: "I need something good" | Agent tự hỏi clarify hoặc fallback | Không crash, trả lời lịch sự |

### Build Check
```bash
cd backend && python -m py_compile rag_engine/agent/agent_runner.py
cd backend && python -m py_compile api/routers/rag.py
```
