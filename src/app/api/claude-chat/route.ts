/**
 * Claude Chat API
 * Provides streaming chat with Claude for the sidebar assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic/client";
import { Attachment } from "@/lib/types";

const MASTER_SYSTEM = `You are an expert book writing assistant integrated into "The Shelf" - an AI-powered book creation platform. You help users with brainstorming, outlining, writing, editing, and answering questions about their book project. Be concise, helpful, and encouraging. Use markdown for formatting when appropriate.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, conversationId } = body;

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
    const streamPromise = streamChat(messages, conversationId, emit);

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
  messages: { role: string; content: string; attachments?: Attachment[] }[],
  conversationId: string | undefined,
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
      content: [
        ...(m.attachments ?? []).flatMap((attachment) => attachmentBlocks(attachment)),
        ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
      ],
    }));

  // Get system message if present
  const systemMessage = messages.find(m => m.role === "system")?.content || MASTER_SYSTEM;

  try {
    const response = await anthropicClient.callClaude(
      conversationId ? `${systemMessage}\nConversation session: ${conversationId}` : systemMessage,
      anthropicMessages,
      4000
    );

    // Stream the response
    onEmit({ type: "content", text: response.text });
  } catch (err: any) {
    onEmit({ type: "error", error: err.message });
  }
}

function attachmentBlocks(attachment: Attachment) {
  const blocks: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }
  > = [];

  if (attachment.content?.trim()) {
    blocks.push({ type: "text", text: `Attached file: ${attachment.name}\n\n${attachment.content}` });
  }

  if (attachment.base64) {
    const match = attachment.base64.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
    if (match) {
      blocks.push({ type: "image", source: { type: "base64", media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: match[2] } });
    }
  }

  return blocks;
}