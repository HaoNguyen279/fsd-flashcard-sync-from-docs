import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, currentWord, currentMeaning } = body as {
      messages: ChatMessage[];
      currentWord?: string;
      currentMeaning?: string;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm GEMINI_API_KEY vào file .env.local để sử dụng tính năng này.",
        },
        { status: 400 }
      );
    }

    // Default model to gemini-2.0-flash-lite or user configured GEMINI_MODEL
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

    // System prompt tailored strictly to user instructions
    const systemInstruction = `You are a concise English learning assistant specialized in helping the user master vocabulary.
Current word being learned on the flashcard: "${currentWord || "N/A"}" (Meaning: "${currentMeaning || "N/A"}").

Guidelines:
1. When asked for examples (or when the user asks for "Lấy câu ví dụ" / examples of the current word):
   - Provide one natural English example sentence for each distinct meaning of the word.
   - Immediately below each English sentence, provide the Vietnamese translation.
   - Format:
     • [English sentence]
       ↳ [Bản dịch tiếng Việt]
   - STRICT RULE: Do NOT include any conversational filler, greetings, or extra explanations when giving examples. ONLY return the examples and translations.

2. When asked any other English-related question (grammar, usage, nuances, pronunciation, synonyms, etc.):
   - Answer concisely, clearly, and directly in Vietnamese (or English if requested).
   - Keep explanations brief and easy to understand.`;

    // Map conversation messages to Gemini format
    const contents = (messages || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data?.error?.message || `Google Gemini API error (status: ${response.status})`;
      return NextResponse.json({ success: false, error: errorMsg }, { status: response.status });
    }

    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || "Không có phản hồi từ mô hình.";

    return NextResponse.json({
      success: true,
      message: replyText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã có lỗi xảy ra khi gọi AI chatbot.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
