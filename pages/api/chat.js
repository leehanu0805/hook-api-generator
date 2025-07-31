export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY

  const userMessage = req.query.q || "Hello"

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
  res.status(200).json(data)
}
