# MCP Memory

This skill integrates with the remote MCP Memory (Mem0) running at `https://harvesthealth-memo.hf.space` to save and retrieve user chat memories.
It uses tools `save_memory` and `search_memories`.

## Tools

### save_memory

Saves a chat memory.

**Prompt Match:** "remember that I...", "save this to memory", "note that..."

**Command:**
```bash
curl -X POST "https://harvesthealth-memo.hf.space/mcp-mem0/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "save_memory",
      "arguments": {
        "text": "${text}"
      }
    }
  }'
```

**Parameters:**
- `text`: The string of the memory you want to save.


### search_memories

Retrieves memories from the MCP endpoint.

**Prompt Match:** "what do you remember about", "do I like..."

**Command:**
```bash
curl -X POST "https://harvesthealth-memo.hf.space/mcp-mem0/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_memories",
      "arguments": {
        "query": "${query}",
        "limit": 3
      }
    }
  }'
```

**Parameters:**
- `query`: The search term or question to query memory.

### get_all_memories

Fetches the complete chat memory stored via the internal direct route.

**Command:**
```bash
curl -X GET "https://harvesthealth-memo.hf.space/api/v1/memories" \
  -H "Content-Type: application/json"
```
