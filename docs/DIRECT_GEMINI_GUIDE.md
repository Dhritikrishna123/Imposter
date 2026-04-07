# Direct Gemini API Usage (No Proxy)

This guide shows how to call the Google Gemini API directly using `fetch` from any JavaScript project (Frontend or Node.js).

## 1. The API Endpoint
The base URL for Gemini 1.5/2.0 is:
`https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent?key={API_KEY}`

> [!IMPORTANT]
> **Model Naming Structure**: 
> - In the **URL path**, the `models/` prefix is **required**.
> - In your **Variable**, you only need the ID (e.g., `gemini-flash-latest`).
> - If you use the **Official SDK**, you don't need the `models/` prefix at all.

## 2. Minimal Fetch Example (JavaScript)

```javascript
async function callGeminiDirectly() {
  const API_KEY = 'YOUR_GOOGLE_AI_STUDIO_KEY';
  const MODEL_ID = 'gemini-1.5-flash'; // or 'gemini-2.0-flash'
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // 1. System Instructions (Optional)
      system_instruction: {
        parts: [{ text: "You are a professional coding assistant." }]
      },
      // 2. Conversation History
      contents: [
        {
          role: "user",
          parts: [{ text: "Hi, I'm working on a new project." }]
        },
        {
          role: "model",
          parts: [{ text: "That sounds exciting! What kind of project is it?" }]
        },
        {
          role: "user",
          parts: [{ text: "It's a web app using the Gemini API." }]
        }
      ],
      // 3. Generation Config (Optional)
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    })
  });

  const data = await response.json();

  if (response.ok) {
    // Access the text response here:
    const assistantText = data.candidates[0].content.parts[0].text;
    console.log("Gemini:", assistantText);
  } else {
    console.error("API Error:", data.error);
  }
}
```

## 3. Key Differences from OpenAI/OpenRouter
| Feature | Gemini Native Format |
| :--- | :--- |
| **Role Names** | Use `user` and `model` (NOT `assistant`). |
| **Message Structure** | Each message is an object with `role` and `parts` (an array of `{ text: "..." }`). |
| **System Prompt** | Use the `system_instruction` field at the top level, NOT inside the `contents` array. |
| **API Key** | Passed as a URL query parameter `?key=...`, not in the `Authorization` header. |

## 4. How to get a Key
Get your free API key at [Google AI Studio](https://aistudio.google.com/).

---

## 5. How to List All Available Models
You can dynamically check which models your API key has access to by calling the `models` endpoint. This is useful for finding the latest version IDs (like `gemini-2.5-flash`).

```javascript
async function listModels() {
  const API_KEY = 'YOUR_GOOGLE_AI_STUDIO_KEY';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      console.log("--- YOUR AVAILABLE MODELS ---");
      data.models.forEach(model => {
        // Output the full name and display name
        console.log(`- ${model.name} (${model.displayName})`);
      });
    } else {
      console.error("Error listing models:", data.error);
    }
  } catch (error) {
    console.error("Network Error:", error.message);
  }
}
```
