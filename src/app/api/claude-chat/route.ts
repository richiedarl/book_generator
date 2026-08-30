/**
 * Claude Chat API
 * Provides streaming chat with Claude for the sidebar assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic/client";

const MASTER_SYSTEM = `You are an expert book writing assistant integrated into "The Shelf" - an AI-powered book creation platform. You help users with brainstorming, outlining, writing, editing, and answering questions about their book project. Be concise, helpful, and encouraging. Use markdown for formatting when appropriate.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing or invalid messages array" },
        { status: 400 }
      );
    }

    // Set up SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const emit = (event: any) => {
      const data = JSON.stringify(event);
      writer.write(encoder.encode(`data: ${data}\n\n`));
    };

    // Start streaming in background
    const streamPromise = streamChat(messages, emit);

    streamPromise.then(() => {
      writer.close();
    }).catch((err: any) => {
      emit({ type: "error", error: err.message });
      writer.close();
    });

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error starting chat:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to start chat" },
      { status: 500 }
    );
  }
}

async function streamChat(
  messages: { role: string; content: string }[],
  onEmit: (event: any) => void
): Promise<void> {
  // Check that Anthropic API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const apiKeys = process.env.ANTHROPIC_API_KEYS;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;

  const hasKey =
    (apiKey && apiKey.trim().length > 0) ||
    (apiKeys && apiKeys.split(",").filter((k: string) => k.trim()).length > 0) ||
    (authToken && authToken.trim().length > 0 && baseUrl && baseUrl.trim().length > 0);

  if (!hasKey) {
    onEmit({
      type: "error",
      error: "Claude API key is not configured. Add ANTHROPIC_API_KEY to your environment variables."
    });
    return;
  }

  // Convert messages to Anthropic format
  const anthropicMessages = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));

  // Get system message if present
  const systemMessage = messages.find(m => m.role === "system")?.content || MASTER_SYSTEM;

  try {
    const response = await anthropicClient.callClaude(
      systemMessage,
      anthropicMessages,
      4000
    );

    // Stream the response
    onEmit({ type: "content", text: response.text });
  } catch (err: any) {
    onEmit({ type: "error", error: err.message });
  }
}