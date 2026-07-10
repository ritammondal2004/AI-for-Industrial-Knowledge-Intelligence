import { create } from "zustand";
import type { Message } from "@/components/ChatMessage";

export type ChatMode = "knowledge" | "copilot" | "rca";

interface ChatState {
  knowledgeHistory: Message[];
  knowledgeBackend: [string, string][];
  copilotHistory: Message[];
  copilotBackend: [string, string][];
  rcaHistory: Message[];
  rcaBackend: [string, string][];

  appendMessage: (mode: ChatMode, msg: Message) => void;
  setBackend: (mode: ChatMode, backend: [string, string][]) => void;
  clear: (mode: ChatMode) => void;
}

const historyKey = (m: ChatMode) => `${m}History` as const;
const backendKey = (m: ChatMode) => `${m}Backend` as const;

export const useChatStore = create<ChatState>((set) => ({
  knowledgeHistory: [],
  knowledgeBackend: [],
  copilotHistory: [],
  copilotBackend: [],
  rcaHistory: [],
  rcaBackend: [],

  appendMessage: (mode, msg) =>
    set((s) => ({ [historyKey(mode)]: [...s[historyKey(mode)], msg] }) as Partial<ChatState>),
  setBackend: (mode, backend) =>
    set(() => ({ [backendKey(mode)]: backend }) as Partial<ChatState>),
  clear: (mode) =>
    set(() => ({ [historyKey(mode)]: [], [backendKey(mode)]: [] }) as Partial<ChatState>),
}));

export function useModeChat(mode: ChatMode) {
  const messages = useChatStore((s) => s[historyKey(mode)]);
  const backend = useChatStore((s) => s[backendKey(mode)]);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const setBackend = useChatStore((s) => s.setBackend);
  const clear = useChatStore((s) => s.clear);
  return {
    messages,
    backend,
    append: (m: Message) => appendMessage(mode, m),
    setBackend: (b: [string, string][]) => setBackend(mode, b),
    clear: () => clear(mode),
  };
}
