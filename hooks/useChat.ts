'use client';

import { useState, useRef, useEffect } from "react";
import { ChatMessage, Task } from "@/lib/schemas";
import { generateId } from "@/lib/id";

export function useChat(
  tasks: Task[],
  onAgentUpdateTasks: (newTasks: Task[]) => void,
  model: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    const key = `taskflow_chat_history`;
    const stored = localStorage.getItem(key);
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
        content: "Hi! I'm **TaskFlow**, your personal AI productivity coach and task breakdown assistant. 🚀\n\nTell me any big goal, project, or chore you're working on (e.g., *'Plan my move to a new apartment'*, *'Build a React website'*, or *'Learn Portuguese'*), and I will instantly break it down into manageable, bite-sized steps for you!",
        timestamp: new Date().toISOString(),
      };
      setTimeout(() => {
        setMessages([welcomeMessage]);
      }, 0);
      localStorage.setItem(key, JSON.stringify([welcomeMessage]));
    }
  }, []);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const saveChatHistory = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(`taskflow_chat_history`, JSON.stringify(updatedMessages));
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
          tasks: tasksRef.current,
          model,
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
        let finalTasks: Task[] | null = null;
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
                finalTasks = data.tasks;
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

        if (finalTasks) {
          onAgentUpdateTasks(finalTasks);
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
        if (data.tasks) {
          onAgentUpdateTasks(data.tasks);
        }
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'model',
        content: `⚠️ Sorry, I encountered an error: ${e.message || 'Unknown error'}. Make sure your GEMINI_API_KEY is configured in Settings > Secrets.`,
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
      content: "Chat cleared. What project or goal would you like me to break down next?",
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
