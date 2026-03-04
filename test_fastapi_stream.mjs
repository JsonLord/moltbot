async function test() {
  const url = "http://127.0.0.1:8000/v1/chat/completions";
  const payload = {
      "model": "Qwen/Qwen2.5-Coder-3B-Instruct",
      "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "hello"}
      ],
      "stream": true,
      "max_tokens": 100
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
