import React, { useState, useRef, useCallback, useMemo } from "react"

// === 1. API 주소 설정 ===
const API_BASE_URL = "https://hook-api-generator.vercel.app"

const TONE_OPTIONS = [
    "Provocative",
    "Calm",
    "Professional",
    "Humorous",
    "Dramatic",
]

const SCORE_THRESHOLDS = {
    VIRAL: 85,
    GOOD: 70,
}

const COLORS = {
    HIGH_SCORE: "#10b981",
    MID_SCORE: "#f59e0b",
    LOW_SCORE: "#ef4444",
}

// HookService - 강화된 프롬프트 적용
class HookService {
    async generateHooks(hookData) {
        if (!hookData || typeof hookData !== "object") {
            throw new Error("유효하지 않은 훅 데이터입니다.")
        }

        try {
            // 🔥 강화된 프롬프트
            const userPrompt = `
You are the TOP 0.1% viral hook specialist who's created hooks for MrBeast, Alex Hormozi, and top creators.

CONTEXT:
Platform: TikTok/Instagram Reels/YouTube Shorts
Goal: Stop scrolling within 0.5 seconds

ANALYZE THE SCRIPT:
"${hookData.script}"

TONE: ${hookData.tone}
${hookData.tone === 'Provocative' ? 'Be bold, controversial, challenge beliefs' : ''}
${hookData.tone === 'Calm' ? 'Be soothing, trustworthy, gentle but intriguing' : ''}
${hookData.tone === 'Professional' ? 'Use authority, data, expert positioning' : ''}
${hookData.tone === 'Humorous' ? 'Be relatable, self-deprecating, use meme culture' : ''}
${hookData.tone === 'Dramatic' ? 'Create tension, cliffhangers, emotional peaks' : ''}

GENERATE 5 HOOKS:
First 3: Use PROVEN viral patterns (10M+ views)
Last 2: Be CREATIVE with POV/Story time/trending formats

RULES:
• MAX 10 words
• First 3 words MUST grab attention
• Use numbers when possible
• Include: fear, curiosity, surprise
• Make it about THEM ("You've been...", "Your...")

OUTPUT FORMAT:
1. [Hook max 10 words] | [Why it works] | [TAG]
2. [Hook max 10 words] | [Why it works] | [TAG]
3. [Hook max 10 words] | [Why it works] | [TAG]
4. [Hook max 10 words] | [Why it works] | [TAG]
5. [Hook max 10 words] | [Why it works] | [TAG]

TAGS: CURIOSITY, FEAR, FOMO, SHOCK, SECRET, CONTRAST, EMOTIONAL, URGENCY, FORBIDDEN`

            const response = await fetch(
                `${API_BASE_URL}/api/chat?q=${encodeURIComponent(userPrompt)}`
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(
                    errorData.error ||
                        `HTTP ${response.status}: 훅 생성에 실패했습니다.`
                )
            }

            const data = await response.json()
            const hooksText = data.choices?.[0]?.message?.content || ""

            return { success: true, hooks: hooksText }
        } catch (error) {
            if (error instanceof TypeError && error.message.includes("fetch")) {
                throw new Error("네트워크 연결을 확인해주세요.")
            }
            throw error
        }
    }
}

const hookService = new HookService()

// 🔥 스마트 점수 계산 시스템
const calculateHookScore = (hook, tag, isProven) => {
    let score = 70; // 기본 점수
    
    // 1. 길이 점수 (짧을수록 높음)
    const wordCount = hook.split(' ').length;
    if (wordCount <= 5) score += 15;
    else if (wordCount <= 8) score += 10;
    else if (wordCount <= 10) score += 5;
    
    // 2. 파워 워드 체크
    const powerWords = ['you', 'your', 'secret', 'never', 'always', 'nobody', 
                       'everyone', 'stop', 'wait', 'literally', 'actually',
                       'wrong', 'mistake', 'truth', 'why', 'how'];
    const hookLower = hook.toLowerCase();
    powerWords.forEach(word => {
        if (hookLower.includes(word)) score += 2;
    });
    
    // 3. 숫자 포함 여부
    if (/\d/.test(hook)) score += 5;
    
    // 4. 물음표/느낌표 사용
    if (hook.includes('?')) score += 3;
    if (hook.includes('!')) score += 2;
    
    // 5. 태그별 가산점
    const tagScores = {
        'CURIOSITY': 5,
        'SHOCK': 7,
        'SECRET': 8,
        'FORBIDDEN': 9,
        'FOMO': 6,
        'URGENCY': 7,
        'CONTRAST': 5,
        'EMOTIONAL': 4
    };
    score += tagScores[tag] || 3;
    
    // 6. 검증된 패턴 보너스
    if (isProven) score += 5;
    
    // 7. 트렌드 포맷 체크
    if (hook.startsWith('POV:') || hook.startsWith('Story time:')) score += 5;
    
    // 최대 100점으로 제한
    return Math.min(score, 100);
};

// 🔥 개선된 파싱 함수
const parseHooksFromText = (hooksText) => {
    const lines = hooksText.split("\n").filter((line) => line.trim())
    const hooks = []

    lines.forEach((line, index) => {
        const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/)
        if (match) {
            const hookText = match[1].trim()
            const tag = match[3].trim()
            const isProven = index < 3
            
            hooks.push({
                hook: hookText,
                score: calculateHookScore(hookText, tag, isProven), // 스마트 점수 적용
                reason: match[2].trim(),
                tag: tag,
                isProven: isProven
            })
        } else {
            // 백업 파싱 로직들...
            const simpleMatch = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+)/)
            if (simpleMatch) {
                const isProven = index < 3
                const fallbackTag = isProven ? "APPROVED" : "ORIGINAL"
                const hookText = simpleMatch[1].trim()
                
                hooks.push({
                    hook: hookText,
                    score: calculateHookScore(hookText, fallbackTag, isProven),
                    reason: simpleMatch[2].trim(),
                    tag: fallbackTag,
                    isProven: isProven
                })
            }
        }
    })

    // 점수 기준으로 정렬 (높은 점수가 위로)
    hooks.sort((a, b) => b.score - a.score)
    
    return hooks
}

// 🔥 검증된 바이럴 훅 데이터베이스 
const PROVEN_VIRAL_HOOKS = {
    curiosity: [
        { template: "Nobody talks about this {topic} trick", score: 92, reason: "Creates knowledge gap + hidden info", tag: "SECRET" },
        { template: "I was today years old when I learned this", score: 89, reason: "Viral format + relatable", tag: "SHOCK" },
        { template: "Wait until you see what happens next", score: 88, reason: "Creates anticipation", tag: "CURIOSITY" },
        { template: "I can't believe this actually worked", score: 87, reason: "Surprise + proven success", tag: "SHOCK" }
    ],
    emotional: [
        { template: "POV: You finally {achievement}", score: 90, reason: "Trending POV format", tag: "EMOTIONAL" },
        { template: "This changed my life in {time}", score: 88, reason: "Transformation story", tag: "PERSONAL" },
        { template: "Stop scrolling. This is important", score: 93, reason: "Direct command + urgency", tag: "URGENCY" }
    ],
    challenge: [
        { template: "99% of people can't {challenge}", score: 91, reason: "Statistical hook + ego challenge", tag: "CONTRAST" },
        { template: "Only {group} will understand this", score: 85, reason: "Exclusive group appeal", tag: "FOMO" }
    ],
    comparison: [
        { template: "What they don't tell you about {topic}", score: 90, reason: "Hidden truth angle", tag: "SECRET" },
        { template: "{oldway} ❌ {newway} ✅", score: 88, reason: "Visual comparison format", tag: "CONTRAST" }
    ],
    shock: [
        { template: "Delete this if it goes viral", score: 93, reason: "Scarcity + viral bait", tag: "FORBIDDEN" },
        { template: "I'm gatekeeping this no more", score: 90, reason: "Exclusive release", tag: "SECRET" }
    ]
}

// 스크립트 분석 함수
function analyzeScriptContext(script) {
    const scriptLower = script.toLowerCase()
    if (scriptLower.includes('discover') || scriptLower.includes('secret')) return 'curiosity'
    if (scriptLower.includes('feel') || scriptLower.includes('life')) return 'emotional'
    if (scriptLower.includes('try') || scriptLower.includes('challenge')) return 'challenge'
    if (scriptLower.includes('vs') || scriptLower.includes('better')) return 'comparison'
    return 'shock'
}

// 템플릿을 실제 훅으로 변환
function generateHookFromTemplate(template, script, tone) {
    let hook = template.template
    const keywords = script.split(' ').filter(w => w.length > 4).slice(0, 3)
    
    const replacements = {
        '{topic}': keywords[0] || 'this',
        '{achievement}': 'made it work',
        '{time}': '30 days',
        '{challenge}': 'do this',
        '{group}': 'pros',
        '{oldway}': 'Old way',
        '{newway}': 'This way'
    }
    
    Object.keys(replacements).forEach(key => {
        hook = hook.replace(key, replacements[key])
    })
    
    return {
        hook: hook,
        score: template.score + Math.floor(Math.random() * 5),
        reason: template.reason,
        tag: template.tag,
        isProven: true,
        enhanced: true
    }
}

// 약한 훅을 검증된 훅으로 교체
function enhanceWeakHooks(hooks, script, tone) {
    const sortedHooks = [...hooks].sort((a, b) => a.score - b.score)
    const weakHooks = sortedHooks.slice(0, 2)
    const weakIndices = weakHooks.map(weak => hooks.indexOf(weak))
    
    const category = analyzeScriptContext(script)
    const templatePool = PROVEN_VIRAL_HOOKS[category]
    
    const enhancedHooks = [...hooks]
    const usedIndices = []
    
    weakIndices.forEach((index) => {
        let randomIndex
        do {
            randomIndex = Math.floor(Math.random() * templatePool.length)
        } while (usedIndices.includes(randomIndex))
        
        usedIndices.push(randomIndex)
        const newHook = generateHookFromTemplate(templatePool[randomIndex], script, tone)
        enhancedHooks[index] = newHook
    })
    
    enhancedHooks.sort((a, b) => b.score - a.score)
    
    return {
        hooks: enhancedHooks,
        replacedCount: 2
    }
}

// 태그 색깔 매핑
const getTagColor = (tag) => {
    const tagColors = {
        'APPROVED': '#10b981',
        'TRENDING': '#f59e0b',
        'EMOTIONAL': '#ef4444',
        'CURIOSITY': '#8b5cf6',
        'ORIGINAL': '#06b6d4',
        'SECRET': '#ec4899',
        'FOMO': '#f59e0b',
        'CONTRAST': '#ef4444',
        'FORBIDDEN': '#dc2626',
        'SHOCK': '#7c3aed',
        'URGENCY': '#ea580c'
    }
    return tagColors[tag] || '#6b7280'
}

const getScoreColor = (score) => {
    if (score >= SCORE_THRESHOLDS.VIRAL) return COLORS.HIGH_SCORE
    if (score >= SCORE_THRESHOLDS.GOOD) return COLORS.MID_SCORE
    return COLORS.LOW_SCORE
}

const getScoreLabel = (score) => {
    if (score >= SCORE_THRESHOLDS.VIRAL) return "VIRAL"
    if (score >= SCORE_THRESHOLDS.GOOD) return "GOOD"
    return "OK"
}

const processApiResponse = (result, script, tone) => {
    if (result.success && result.hooks) {
        const parsedHooks = parseHooksFromText(result.hooks)
        
        // 🔥 약한 훅 2개를 검증된 바이럴 훅으로 자동 교체
        if (parsedHooks.length >= 3) {
            const enhanced = enhanceWeakHooks(parsedHooks, script, tone)
            console.log(`Replaced ${enhanced.replacedCount} weak hooks with proven viral patterns`)
            return enhanced.hooks
        }
        
        return parsedHooks
    }
    // 폴백 로직
    return []
}

export default function HookLab() {
    const [script, setScript] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [hooks, setHooks] = useState([])
    const [tone, setTone] = useState("Provocative")
    const [copiedIndex, setCopiedIndex] = useState(null)
    const [error, setError] = useState(null)

    const fileInputRef = useRef(null)

    const handleFileUpload = useCallback((event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.type !== "text/plain") {
            alert("Please upload a .txt file only")
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result
            if (typeof content === "string") {
                setScript(content)
            }
        }
        reader.readAsText(file, "utf-8")
    }, [])

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) return

        setIsLoading(true)
        setError(null)
        setHooks([])

        try {
            const result = await hookService.generateHooks({
                script: script,
                tone: tone,
            })

            const processedHooks = processApiResponse(result)

            if (processedHooks.length > 0) {
                setHooks(processedHooks)
            } else {
                throw new Error("유효한 훅이 생성되지 않았습니다.")
            }
        } catch (error) {
            setError(
                `Sorry, something went wrong. Please try again later. (Error: ${error.message})`
            )
        }

        setIsLoading(false)
    }, [script, tone])

    const handleRegenerate = useCallback(() => {
        handleGenerate()
    }, [handleGenerate])

    const copyToClipboard = useCallback(async (text, index) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex(null), 2000)
        } catch {
            const textArea = document.createElement("textarea")
            textArea.value = text
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand("copy")
            document.body.removeChild(textArea)
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex(null), 2000)
        }
    }, [])

    const containerStyle = useMemo(
        () => ({
            minHeight: "800px",
            backgroundColor: "#000000",
            padding: "24px",
            fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: "#ffffff",
        }),
        []
    )

    const inputSectionStyle = useMemo(
        () => ({
            backgroundColor: "#111111",
            borderRadius: "12px",
            border: "1px solid #333333",
            padding: "24px",
            marginBottom: "32px",
        }),
        []
    )

    const textareaStyle = useMemo(
        () => ({
            width: "100%",
            height: "140px",
            padding: "16px",
            border: "1px solid #333333",
            borderRadius: "8px",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#000000",
            color: "#ffffff",
        }),
        []
    )

    const isGenerateDisabled = !script.trim() || isLoading

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                {/* 헤더 */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <h1
                        style={{
                            fontSize: "32px",
                            fontWeight: "700",
                            color: "#ffffff",
                            marginBottom: "8px",
                            margin: "0 0 8px 0",
                        }}
                    >
                        Hook Lab
                    </h1>
                    <p
                        style={{
                            color: "#888888",
                            margin: "0",
                            fontSize: "16px",
                        }}
                    >
                        AI analyzes your script and recommends 5 perfect hooks
                        to grab attention
                    </p>
                </div>

                {/* 입력 섹션 */}
                <div style={inputSectionStyle}>
                    <div style={{ marginBottom: "20px" }}>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="Paste your video script here"
                            style={textareaStyle}
                        />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                            }}
                        >
                            <input
                                type="file"
                                accept=".txt"
                                style={{ display: "none" }}
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 16px",
                                    color: "#888888",
                                    border: "1px solid #333333",
                                    borderRadius: "8px",
                                    backgroundColor: "#111111",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                📁 Upload .txt file
                            </button>
                            <span
                                style={{ fontSize: "14px", color: "#666666" }}
                            >
                                Characters: {script.length}
                            </span>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: isGenerateDisabled
                                    ? "#333333"
                                    : "#ffffff",
                                color: isGenerateDisabled
                                    ? "#666666"
                                    : "#000000",
                                borderRadius: "8px",
                                fontWeight: "600",
                                border: "none",
                                cursor: isGenerateDisabled
                                    ? "not-allowed"
                                    : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "14px",
                            }}
                        >
                            {isLoading ? "Generating..." : "Generate Hooks"}
                        </button>
                    </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div
                        style={{
                            backgroundColor: "#2d1b1b",
                            border: "1px solid #ef4444",
                            borderRadius: "12px",
                            padding: "20px",
                            marginBottom: "32px",
                            textAlign: "center",
                        }}
                    >
                        <p
                            style={{
                                color: "#ef4444",
                                fontSize: "16px",
                                margin: "0",
                                fontWeight: "500",
                            }}
                        >
                            {error}
                        </p>
                    </div>
                )}

                {/* 결과 섹션 */}
                {hooks.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                        }}
                    >
                        {/* 옵션 바 */}
                        <div
                            style={{
                                backgroundColor: "#111111",
                                borderRadius: "12px",
                                border: "1px solid #333333",
                                padding: "16px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: "16px",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            color: "#ffffff",
                                        }}
                                    >
                                        Tone:
                                    </span>
                                    <select
                                        value={tone}
                                        onChange={(e) =>
                                            setTone(e.target.value)
                                        }
                                        style={{
                                            padding: "6px 12px",
                                            border: "1px solid #333333",
                                            borderRadius: "6px",
                                            outline: "none",
                                            fontSize: "14px",
                                            backgroundColor: "#000000",
                                            color: "#ffffff",
                                        }}
                                    >
                                        {TONE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleRegenerate}
                                    disabled={isLoading}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 16px",
                                        color: isLoading
                                            ? "#666666"
                                            : "#ffffff",
                                        border: `1px solid ${isLoading ? "#666666" : "#ffffff"}`,
                                        borderRadius: "8px",
                                        backgroundColor: "transparent",
                                        cursor: isLoading
                                            ? "not-allowed"
                                            : "pointer",
                                        fontSize: "14px",
                                    }}
                                >
                                    🔄 Regenerate
                                </button>
                            </div>
                        </div>

                        {/* 훅 카드들 */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(300px, 1fr))",
                                gap: "20px",
                            }}
                        >
                            {hooks.map((hook, index) => {
                                const scoreColor = getScoreColor(hook.score)
                                const scoreLabel = getScoreLabel(hook.score)
                                const isCopied = copiedIndex === index

                                return (
                                    <div
                                        key={index}
                                        onClick={() =>
                                            copyToClipboard(hook.hook, index)
                                        }
                                        style={{
                                            backgroundColor: "#111111",
                                            borderRadius: "12px",
                                            border: isCopied
                                                ? "2px solid #ffffff"
                                                : "1px solid #333333",
                                            padding: "24px",
                                            cursor: "pointer",
                                            position: "relative",
                                            transition: "all 0.2s ease",
                                            transform: isCopied
                                                ? "scale(1.02)"
                                                : "scale(1)",
                                        }}
                                    >
                                        {/* 복사 표시 */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "16px",
                                                right: "16px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            {isCopied && (
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#000000",
                                                        fontWeight: "600",
                                                        backgroundColor:
                                                            "#ffffff",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                    }}
                                                >
                                                    Copied!
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    color: "#666666",
                                                    fontSize: "18px",
                                                }}
                                            >
                                                📋
                                            </span>
                                        </div>

                                        {/* 훅 텍스트 */}
                                        <div
                                            style={{
                                                paddingRight: "60px",
                                                marginBottom: "20px",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    fontSize: "18px",
                                                    fontWeight: "600",
                                                    color: "#ffffff",
                                                    lineHeight: "1.5",
                                                    margin: "0",
                                                }}
                                            >
                                                {hook.hook}
                                            </p>
                                        </div>

                                        {/* 점수 */}
                                        <div style={{ marginBottom: "16px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    marginBottom: "10px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "20px",
                                                        fontWeight: "700",
                                                        color: scoreColor,
                                                    }}
                                                >
                                                    {hook.score}/100
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        backgroundColor:
                                                            scoreColor,
                                                        color: "#000000",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {scoreLabel}
                                                </span>
                                                {hook.tag && (
                                                    <span
                                                        style={{
                                                            fontSize: "10px",
                                                            backgroundColor:
                                                                getTagColor(
                                                                    hook.tag
                                                                ),
                                                            color: "#ffffff",
                                                            padding: "2px 6px",
                                                            borderRadius: "8px",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        {hook.tag}
                                                    </span>
                                                )}
                                                {hook.enhanced && (
                                                    <span
                                                        style={{
                                                            fontSize: "10px",
                                                            backgroundColor: "#fbbf24",
                                                            color: "#000000",
                                                            padding: "2px 6px",
                                                            borderRadius: "8px",
                                                            fontWeight: "600",
                                                            marginLeft: "4px"
                                                        }}
                                                    >
                                                        ⚡ PROVEN
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    width: "100%",
                                                    backgroundColor: "#000000",
                                                    borderRadius: "10px",
                                                    height: "8px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        height: "8px",
                                                        borderRadius: "10px",
                                                        backgroundColor:
                                                            scoreColor,
                                                        width: `${hook.score}%`,
                                                        transition:
                                                            "width 0.8s ease",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* 설명 */}
                                        <p
                                            style={{
                                                fontSize: "14px",
                                                color: "#888888",
                                                margin: "0",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            {hook.reason}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 로딩 상태 */}
                {isLoading && hooks.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                border: "3px solid #333333",
                                borderTop: "3px solid #ffffff",
                                borderRadius: "50%",
                                margin: "0 auto 20px",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                        <p
                            style={{
                                color: "#888888",
                                fontSize: "16px",
                                margin: "0",
                            }}
                        >
                            Analyzing your script and generating viral hooks...
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
