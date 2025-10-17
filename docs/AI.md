# AI Features

## Overview

Two AI endpoints powered by OpenRouter (server-side only, never exposes API key to client).

## 1. Coach Endpoint

**URL**: `POST /api/ai/coach`

**Purpose**: Provide actionable performance coaching based on metrics.

**Request**:
```json
{
  "agentId": "AGT001",
  "teamId": "team-1",
  "question": "Why is my CC below target?",
  "metrics": {
    "ccPct": 75,
    "scPct": 12,
    "upPct": 20,
    "fixedPct": 55
  },
  "targetConfig": {
    "ccTarget": 80,
    "scTarget": 15,
    "upTarget": 25,
    "fixedTarget": 60
  }
}
```

**Response**:
```json
{
  "answer": "Your CC is 75%, which is 5% below the 80% target. Consider:\n- Review class schedule conflicts\n- Follow up with no-shows\n- Check engagement in first 2 weeks of month\n\nNext actions:\n1. Analyze attendance patterns\n2. Schedule 3 follow-up calls this week",
  "cached": false
}
```

**System Prompt**:
> "You are a performance analytics coach. Be concise, factual, and actionable. Always ground advice in the provided metrics, targets, weights, and pacing. No generic platitudes."

**Features**:
- Redacts sensitive data (names, IDs) in logs
- Caches identical queries (5 min TTL)
- Rate limited (20 req / 15 min)

## 2. Help Endpoint

**URL**: `POST /api/ai/help`

**Purpose**: Answer questions about the platform using docs.

**Request**:
```json
{
  "question": "How do I import data from Google Sheets?"
}
```

**Response**:
```json
{
  "answer": "To import from Google Sheets:\n1. Enable Google Sheets API in Cloud Console\n2. Create API key\n3. Set SHEETS_API_KEY in environment\n4. In Admin › Ingestion, provide spreadsheetId and range\n\nSee Docs › Ingestion for detailed steps.",
  "citations": ["Docs › Ingestion", "Docs › Deployment"],
  "cached": false
}
```

**System Prompt**:
> "You are a helpful assistant for the Operations Analytics Platform. Answer questions based ONLY on the provided documentation. Include doc citations. If information is not in docs, say so."

**Features**:
- Retrieves relevant doc snippets (semantic search or keyword match)
- Provides citations (doc name)
- Caches common questions
- Rate limited (30 req / 15 min)

## Configuration

**Environment Variables**:
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `OPENROUTER_MODEL`: Model to use (default: `anthropic/claude-3.5-sonnet`)
- `OPENROUTER_BASE_URL`: API base URL

**Limits** (configurable in constants.ts):
- `MAX_CONTEXT_TOKENS`: 4000
- `RESPONSE_MAX_TOKENS`: 500
- `TEMPERATURE`: 0.7
- `CACHE_TTL_MS`: 300000 (5 min)

## Privacy & Security

- API key stored server-side only
- Requests logged with redacted PII
- Responses cached by hash (no storage of sensitive data)
- Team-scoped access (leaders can't query other teams)

## UI Integration

**Coach**: Accessible from agent detail modals ("Ask AI for coaching")
**Help**: Right-side drawer on Help page (chat interface)

Both show typing indicators, error states, and "cached" badges.

## Future Enhancements

- Streaming responses
- Multi-turn conversations
- Proactive insights (weekly summary emails)
- Custom prompts per team
