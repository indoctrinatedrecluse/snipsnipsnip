import { redactSensitiveData } from "@/lib/crypto/secure-storage";

export type AiProvider =
  | "gemini"
  | "claude"
  | "deepseek"
  | "openai"
  | "custom";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export type AiActionType =
  | "explain"
  | "types"
  | "docs"
  | "tests"
  | "convert"
  | "refactor"
  | "custom";

export interface AiExecutionRequest {
  action: AiActionType;
  code: string;
  language: string;
  customInstruction?: string;
  targetLanguage?: string;
  config: AiConfig;
}

export interface AiExecutionResult {
  fullText: string;
  extractedCode?: string;
  explanation?: string;
}

export function buildAiPrompt(
  action: AiActionType,
  code: string,
  language: string,
  customInstruction?: string,
  targetLanguage?: string,
): { system: string; user: string } {
  const system =
    "You are an expert software engineer and code assistant inside SnippetVault. Provide precise, production-grade output. When generating code, wrap the primary source code inside a markdown code fence like ```" +
    (targetLanguage || language || "") +
    "\n...``` so it can be directly imported or replaced.";

  let user = "";

  switch (action) {
    case "explain":
      user = `Explain this ${language} code snippet clearly. Break down how it works, key algorithmic steps or patterns, potential edge cases, and time/space complexity:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "types":
      user = `Generate comprehensive TypeScript interface definitions and type signatures for the following ${language} code/data. Include JSDoc descriptions for properties:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "docs":
      user = `Add clean, idiomatic documentation (docstrings / JSDoc / comments) and type annotations to the following ${language} code. Preserve original logic:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "tests":
      user = `Write a comprehensive, idiomatic unit test suite for the following ${language} code. Cover standard cases, edge cases, and error conditions:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "convert":
      user = `Transpile and convert the following ${language} code into idiomatic ${targetLanguage || "TypeScript"}. Follow best practices for ${targetLanguage || "TypeScript"}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "refactor":
      user = `Refactor and optimize the following ${language} code. Improve readability, performance, and robustness, while keeping functionality identical. Include brief comments on changes:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
    case "custom":
      user = `${customInstruction || "Refactor this code"}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      break;
  }

  return { system, user };
}

/**
 * Extracts the primary fenced code block from an AI Markdown response,
 * along with surrounding commentary.
 */
export function extractCodeAndExplanation(markdown: string): {
  code?: string;
  explanation: string;
} {
  const codeBlockRegex = /```(?:[a-zA-Z0-9_\-+]*)\r?\n([\s\S]*?)```/;
  const match = codeBlockRegex.exec(markdown);

  if (match) {
    const code = match[1].trim();
    const explanation = markdown.replace(codeBlockRegex, "").trim();
    return { code, explanation: explanation || markdown };
  }

  return { explanation: markdown };
}

/**
 * Dispatches an AI completion request to the configured provider:
 * Google Gemini, Anthropic Claude, DeepSeek, OpenAI, or custom OpenAI-compatible endpoint.
 */
export async function executeAiAction(
  request: AiExecutionRequest,
): Promise<AiExecutionResult> {
  const { config, action, code, language, customInstruction, targetLanguage } =
    request;
  const { system, user } = buildAiPrompt(
    action,
    code,
    language,
    customInstruction,
    targetLanguage,
  );

  let fullText = "";

  if (config.provider === "gemini") {
    fullText = await callGemini(config.apiKey, config.model, system, user);
  } else if (config.provider === "claude") {
    fullText = await callClaude(config.apiKey, config.model, system, user);
  } else if (config.provider === "deepseek") {
    fullText = await callOpenAiCompatible(
      "https://api.deepseek.com",
      config.apiKey,
      config.model || "deepseek-chat",
      system,
      user,
    );
  } else if (config.provider === "openai") {
    fullText = await callOpenAiCompatible(
      "https://api.openai.com/v1",
      config.apiKey,
      config.model || "gpt-4o-mini",
      system,
      user,
    );
  } else if (config.provider === "custom") {
    const baseUrl = (config.baseUrl || "http://localhost:11434/v1").replace(
      /\/$/,
      "",
    );
    fullText = await callOpenAiCompatible(
      baseUrl,
      config.apiKey || "dummy",
      config.model || "default",
      system,
      user,
    );
  } else {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  const { code: extractedCode, explanation } =
    extractCodeAndExplanation(fullText);

  return {
    fullText,
    extractedCode,
    explanation,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  if (!apiKey) throw new Error("Gemini API key is required");
  const modelName = model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelName,
  )}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${redactSensitiveData(errorBody)}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  if (!apiKey) throw new Error("Claude API key is required");
  const modelName = model || "claude-3-5-sonnet-20241022";
  const url = "https://api.anthropic.com/v1/messages";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Claude API error (${res.status}): ${redactSensitiveData(errorBody)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error("Claude returned empty response");
  }
  return text;
}

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`AI API error (${res.status}): ${redactSensitiveData(errorBody)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("AI returned empty response");
  }
  return text;
}
