'use client';

import { useState, useRef, useEffect } from "react";
import { ChatMessage, Task } from "@/lib/schemas";

export function useChat(
  tasks: Task[],
  onAgentUpdateTasks: (newTasks: Task[]) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const saveChatHistory = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(`taskflow_chat_history`, JSON.stringify(updatedMessages));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
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
          tasks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI agent.');
      }

      const data = await response.json();

      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: data.content,
        timestamp: new Date().toISOString(),
        toolCalls: data.toolCalls && data.toolCalls.length > 0 ? data.toolCalls : undefined,
      };

      saveChatHistory([...newMessages, agentMessage]);

      if (data.tasks) {
        onAgentUpdateTasks(data.tasks);
      }

    } catch (e: any) {
      console.error(e);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: `⚠️ Sorry, I encountered an error: ${e.message || 'Unknown error'}. Make sure your GEMINI_API_KEY is configured in Settings > Secrets.`,
        timestamp: new Date().toISOString(),
      };
      saveChatHistory([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
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
    messagesEndRef,
    handleSubmit,
    handleClearChat,
    handleSendMessage,
  };
}
