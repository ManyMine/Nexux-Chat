import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, Send, X, MessageSquare, RefreshCw } from 'lucide-react';
import { Message } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';

interface GeminiAssistantProps {
  messages: Message[];
  onClose: () => void;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ messages, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getChatContext = () => {
    return messages.map(m => `${m.senderName}: ${m.content}`).join('\n');
  };

  const handleAskGemini = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chatContext = getChatContext();
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um assistente de chat inteligente. Aqui está o contexto das últimas mensagens:\n${chatContext}\n\nPergunta do usuário: ${prompt}`,
        config: {
          systemInstruction: "Você é um assistente prestativo integrado em um aplicativo de mensagens. Ajude o usuário a resumir conversas, redigir respostas ou tirar dúvidas sobre o contexto do chat. Responda de forma concisa e amigável em português."
        }
      });
      
      setResponse(result.text || "Não consegui gerar uma resposta.");
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setResponse("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0) {
      setResponse("Não há mensagens para resumir.");
      return;
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chatContext = getChatContext();
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Resuma as seguintes mensagens de chat de forma clara e concisa, destacando os pontos principais e quem disse o quê:\n${chatContext}`,
      });
      
      setResponse(result.text || "Não consegui gerar um resumo.");
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setResponse("Ocorreu um erro ao gerar o resumo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="w-80 bg-bg-secondary border-l border-border-primary/50 flex flex-col h-full shadow-xl z-20"
    >
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-primary/50 bg-bg-primary">
        <div className="flex items-center space-x-2 text-[#5865f2]">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-text-primary">Gemini AI</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent">
        {!response && !isLoading && (
          <div className="text-center space-y-6 mt-8">
            <div className="bg-bg-primary p-6 rounded-full inline-block shadow-lg">
              <Sparkles className="w-10 h-10 text-[#5865f2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-text-primary font-bold text-lg">Como posso ajudar?</h3>
              <p className="text-xs text-text-muted px-4">Posso resumir o chat, ajudar a escrever mensagens ou analisar o contexto.</p>
            </div>
            <div className="space-y-2 px-2">
              <button 
                onClick={handleSummarize}
                className="w-full flex items-center justify-center space-x-2 bg-bg-tertiary hover:bg-bg-secondary text-text-primary text-sm py-2.5 rounded-md transition-colors border border-border-primary"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Resumir Conversa</span>
              </button>
              <button 
                onClick={() => setPrompt("O que foi discutido sobre o projeto?")}
                className="w-full flex items-center justify-center space-x-2 bg-bg-tertiary hover:bg-bg-secondary text-text-muted text-xs py-2 rounded-md transition-colors border border-border-primary"
              >
                <span>"O que foi discutido?"</span>
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#5865f2] animate-spin" />
              <Sparkles className="w-4 h-4 text-[#5865f2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-text-muted animate-pulse">Consultando o Gemini...</p>
          </div>
        )}

        {response && !isLoading && (
          <div className="space-y-4">
            <div className="bg-bg-primary p-4 rounded-lg border border-border-primary text-sm text-text-secondary leading-relaxed whitespace-pre-wrap shadow-inner relative group">
              {response}
              <button 
                onClick={() => setResponse(null)}
                className="absolute top-2 right-2 p-1 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                title="Limpar"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <button 
              onClick={() => setResponse(null)}
              className="text-xs text-[#5865f2] hover:underline"
            >
              Fazer outra pergunta
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border-primary/50 bg-bg-primary">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskGemini();
              }
            }}
            placeholder="Pergunte ao Gemini..."
            className="w-full bg-bg-tertiary text-sm text-text-secondary p-3 pr-10 rounded-md outline-none focus:ring-1 focus:ring-[#5865f2] resize-none h-24 scrollbar-none"
          />
          <button 
            onClick={handleAskGemini}
            disabled={!prompt.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-[#5865f2] text-white rounded-md hover:bg-[#4752c4] disabled:opacity-50 disabled:bg-bg-tertiary transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2 text-center">
          O Gemini pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </motion.div>
  );
};

