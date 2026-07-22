'use client';

import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChatMessage, Resume } from "@/lib/schemas";
import { generateId } from "@/lib/id";
import { db, saveMessage, createConversation, updateConversationTitle, updateConversationResume, clearChatMessages } from "@/lib/db/db";

export function useChat(
  chatId: string,
  model: string,
  thinkingLevel?: string
) {
  const rawMessages = useLiveQuery(
    () => db.messages.where('chatId').equals(chatId).sortBy('timestamp'),
    [chatId]
  );

  const currentConv = useLiveQuery(
    () => db.conversations.get(chatId),
    [chatId]
  );

  const messages: ChatMessage[] = (rawMessages || []).map(({ chatId: _, ...m }) => m as ChatMessage);
  const resume: Resume | undefined = currentConv?.resume;

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef(resume);

  // Initialize conversation in Dexie if it doesn't exist
  useEffect(() => {
    if (!chatId) return;
    db.conversations.get(chatId).then(existing => {
      if (!existing) {
        createConversation(chatId, 'New Chat', model, thinkingLevel).then(() => {
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'model',
            content: "Hi! I'm **ResumeFlow**, your AI resume tailoring assistant. 📝\n\nPaste your resume text in the chat or open the **Resume Drawer** on the right to edit it. Ask me: *'Parse my resume'* or *'Rewrite my summary section'*.",
            timestamp: new Date().toISOString(),
          };
          saveMessage(chatId, welcomeMessage);
        });
      }
    });
  }, [chatId, model, thinkingLevel]);

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingContent]);

  const handleUpdateResume = async (updated: Resume) => {
    if (!chatId) return;
    await updateConversationResume(chatId, updated);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !chatId) return;

    // Set title on first user message if title is default
    const conv = await db.conversations.get(chatId);
    if (conv && (conv.title === 'New Chat' || !conv.title)) {
      const generatedTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      await updateConversationTitle(chatId, generatedTitle);
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    await saveMessage(chatId, userMessage);
    const updatedMessages = [...messages, userMessage];

    setInputValue('');
    setIsLoading(true);

    try {
      const activeResumes = resumeRef.current ? [resumeRef.current] : [];
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls,
          })),
          resumes: activeResumes,
          model,
          thinkingLevel,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to get response from AI agent.' }));
        throw new Error(err.error || 'Failed to get response from AI agent.');
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';
        let finalResumes: Resume[] | null = null;
        let finalToolCalls: any[] | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop()!;

          for (const part of parts) {
            const lines = part.split('\n');
            const eventLine = lines.find(l => l.startsWith('event: '));
            const dataLine = lines.find(l => l.startsWith('data: '));
            if (!eventLine || !dataLine) continue;

            const eventType = eventLine.slice(7).trim();
            const data = JSON.parse(dataLine.slice(6));

            switch (eventType) {
              case 'text_chunk':
                accumulatedContent += data;
                setStreamingContent(accumulatedContent);
                break;
              case 'done':
                finalResumes = data.resumes;
                finalToolCalls = data.toolCalls;
                break;
              case 'error':
                throw new Error(data.message || 'Stream error');
            }
          }
        }

        if (accumulatedContent) {
          const agentMessage: ChatMessage = {
            id: generateId(),
            role: 'model',
            content: accumulatedContent,
            timestamp: new Date().toISOString(),
            toolCalls: finalToolCalls && finalToolCalls.length > 0 ? finalToolCalls : undefined,
          };
          await saveMessage(chatId, agentMessage);
        }

        if (finalResumes && finalResumes.length > 0) {
          await handleUpdateResume(finalResumes[0]);
        }
      } else {
        const data = await response.json();
        const agentMessage: ChatMessage = {
          id: generateId(),
          role: 'model',
          content: data.content,
          timestamp: new Date().toISOString(),
          toolCalls: data.toolCalls && data.toolCalls.length > 0 ? data.toolCalls : undefined,
        };
        await saveMessage(chatId, agentMessage);
        if (data.resumes && data.resumes.length > 0) {
          await handleUpdateResume(data.resumes[0]);
        }
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'model',
        content: `⚠️ Sorry, I encountered an error: ${e.message || 'Unknown error'}. Make sure your GEMINI_API_KEY is configured.`,
        timestamp: new Date().toISOString(),
      };
      await saveMessage(chatId, errorMessage);
    } finally {
      setIsLoading(false);
      setStreamingContent(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearChat = async () => {
    if (!chatId) return;
    await clearChatMessages(chatId);
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      content: "Chat cleared. Ready to work on your resume!",
      timestamp: new Date().toISOString(),
    };
    await saveMessage(chatId, welcomeMessage);
  };

  return {
    messages,
    resume,
    inputValue,
    setInputValue,
    isLoading,
    streamingContent,
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
    handleUpdateResume,
  };
}
