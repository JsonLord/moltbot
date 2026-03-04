async function test() {
  const url = "http://127.0.0.1:8000/v1/chat/completions";
  const payload = {
      "model": "Qwen/Qwen2.5-Coder-3B-Instruct",
      "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "hello"}
      ],
      "stream": true,
      "temperature": 0.7,
      "max_tokens": 100,
      "parallel_tool_calls": true,
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_weather",
            "description": "Get the current weather",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string"
                }
              },
              "additionalProperties": false,
              "$schema": "http://json-schema.org/draft-07/schema#"
            }
          }
        }
      ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dummy-key' },
    body: JSON.stringify(payload)
  });
  console.log(response.status);
  const text = await response.text();
  console.log(text);
}

test();
