export default async function handler(req, res) {
  // ---- 1. CORS 허용 (Framer, localhost, 다른 도메인 다 접근 가능하게) ----
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // 브라우저 사전 요청(OPTIONS)은 여기서 바로 OK 응답
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // ---- 2. OpenAI API 호출 ----
  const apiKey = process.env.OPENAI_API_KEY
  const userMessage = req.query.q || "Hello"

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }],
      })
    })

    const data = await response.json()

    // ---- 3. 결과 응답 ----
    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error calling OpenAI API" })
  }
}
