'use client';

import { useState, useRef, useEffect } from "react";
import { ChatMessage, Resume } from "@/lib/schemas";
import { generateId } from "@/lib/id";

const CHAT_STORAGE_KEY = "resumeflow_chat_history";

export function useChat(
  resumes: Resume[],
  onAgentUpdateResumes: (newResumes: Resume[]) => void,
  model: string,
  thinkingLevel?: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resumesRef = useRef(resumes);

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimeout(() => {
          setMessages(parsed);
        }, 0);
      } catch (e) {
        console.error("Error parsing chat history", e);
      }
    } else {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'model',
        content: "Hi! I'm **ResumeFlow**, your AI resume tailoring assistant. 📝\n\nPaste your resume text and I'll help you parse it into sections, rewrite specific parts, or tailor it for a job application. Try saying: *'Parse my resume'* or *'Rewrite my summary section'*.",
        timestamp: new Date().toISOString(),
      };
      setTimeout(() => {
        setMessages([welcomeMessage]);
      }, 0);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcomeMessage]));
    }
  }, []);

  useEffect(() => {
    resumesRef.current = resumes;
  }, [resumes]);

  const saveChatHistory = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updatedMessages));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingContent]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    saveChatHistory(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls,
          })),
          resumes: resumesRef.current,
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
          saveChatHistory([...newMessages, agentMessage]);
        }

        if (finalResumes) {
          onAgentUpdateResumes(finalResumes);
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
        saveChatHistory([...newMessages, agentMessage]);
        if (data.resumes) {
          onAgentUpdateResumes(data.resumes);
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
      saveChatHistory([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      content: "Chat cleared. Ready to work on your resume! Paste your text or ask for help tailoring a section.",
      timestamp: new Date().toISOString(),
    };
    saveChatHistory([welcomeMessage]);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    streamingContent,
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
  };
}
