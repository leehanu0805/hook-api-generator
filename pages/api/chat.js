// api/chat.js - Vercel에 배포할 백엔드 코드

// 🔥 메모리 캐시 (API 비용 절감용)
const cache = new Map();

export default async function handler(req, res) {
  // ---- 1. CORS 설정 (모든 도메인 허용) ----
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  // 브라우저 사전 요청(OPTIONS) 처리
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  
  // ---- 2. 요청 검증 ----
  const userMessage = req.query.q || ""
  
  if (!userMessage || userMessage.length < 10) {
    return res.status(400).json({ 
      error: "Invalid request. Please provide a valid prompt." 
    })
  }
  
  // 요청 크기 제한 (너무 긴 프롬프트 방지)
  if (userMessage.length > 5000) {
    return res.status(400).json({ 
      error: "Request too large. Maximum 5000 characters." 
    })
  }
  
  // ---- 3. 캐시 확인 (5분간 유지) ----
  const cacheKey = userMessage.substring(0, 100); // 캐시 키
  const cachedData = cache.get(cacheKey);
  
  if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
    console.log('Cache hit! Returning cached response');
    return res.status(200).json(cachedData.data);
  }
  
  // ---- 4. OpenAI API 호출 ----
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: "Server configuration error. API key missing." 
    })
  }
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview", // 더 좋은 품질을 위해 GPT-4 사용 (원하면 gpt-3.5-turbo로 변경 가능)
        messages: [
          {
            role: "system",
            content: `You are a viral hook specialist who ALWAYS analyzes script context first.
            
CRITICAL RULES:
1. READ the entire script carefully
2. IDENTIFY the main topic, emotion, and value proposition
3. CREATE hooks using ACTUAL words and concepts from the script
4. NEVER use generic hooks - every hook must be specific to the script content
5. Match the emotional tone of the script (don't force humor on serious topics)
6. Promise only what the script actually delivers

Your hooks must feel like they were written specifically for THIS script, not copy-pasted templates.`
          },
          { 
            role: "user", 
            content: userMessage 
          }
        ],
        temperature: 0.8, // 창의성 증가
        max_tokens: 500,  // 토큰 제한 (비용 절감)
        presence_penalty: 0.5, // 반복 방지
        frequency_penalty: 0.5 // 다양성 증가
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API Error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // ---- 5. 응답 검증 ----
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Invalid response from OpenAI")
    }
    
    // ---- 6. 캐시 저장 ----
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    })
    
    // 캐시 크기 제한 (최대 100개)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    // ---- 7. 성공 응답 ----
    res.status(200).json(data)
    
  } catch (error) {
    console.error('Error details:', error)
    
    // 에러 타입별 처리
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ 
        error: "Too many requests. Please try again later." 
      })
    }
    
    if (error.message.includes('API key')) {
      return res.status(401).json({ 
        error: "Authentication failed. Invalid API key." 
      })
    }
    
    // 일반 에러
    res.status(500).json({ 
      error: "Failed to generate hooks. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ---- 추가 유틸리티 함수 (선택적) ----

// 캐시 초기화 함수 (필요시 사용)
export function clearCache() {
  cache.clear()
  console.log('Cache cleared')
}

// 캐시 상태 확인 함수 (디버깅용)
export function getCacheStatus() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  }
}
