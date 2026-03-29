# Cognee MCO (Foundational Knowledge)

This skill integrates the Cognee MCP endpoint running at `https://harvesthealth-cognee-mco.hf.space` (RAG solution). It is used to query foundational knowledge about the user and agent behavioral requirements.

## Tools

### call_cognee_tool

Invokes the `Cognify_and_search` MCP tool to index and search foundational knowledge.

**Prompt Match:** "Search foundational knowledge", "cognee search", "store info about me"

**Command:**
```bash
curl -X POST "https://harvesthealth-cognee-mco.hf.space/call_tool" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cognify_and_search",
    "arguments": {
      "text": "${text}",
      "search_query": "${search_query}"
    }
  }'
```

**Parameters:**
- `text`: Information to store in the knowledge graph.
- `search_query`: The question or query to retrieve from foundational knowledge.
