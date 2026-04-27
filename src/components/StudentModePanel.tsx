import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Video, FileText, Bot, X, GraduationCap, Loader2, Send } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

const SUBJECTS = [
  { id: 'portugues', name: 'Português', icon: '📚' },
  { id: 'matematica', name: 'Matemática', icon: '🔢' },
  { id: 'historia', name: 'História', icon: '⏳' },
  { id: 'geografia', name: 'Geografia', icon: '🌍' },
  { id: 'ciencias', name: 'Ciências', icon: '🧪' },
  { id: 'ingles', name: 'Inglês', icon: '🇬🇧' },
  { id: 'artes', name: 'Artes', icon: '🎨' },
  { id: 'edfisica', name: 'Educação Física', icon: '⚽' },
  { id: 'biologia', name: 'Biologia', icon: '🌿' },
  { id: 'fisica', name: 'Física', icon: '⚛️' },
  { id: 'quimica', name: 'Química', icon: '⚗️' },
  { id: 'filosofia', name: 'Filosofia', icon: '🤔' },
  { id: 'sociologia', name: 'Sociologia', icon: '👥' },
];

export const StudentModePanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [mode, setMode] = useState<'menu' | 'help' | 'ai'>('menu');
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  const handleAiHelp = async () => {
    if (!query.trim() || !selectedSubject) return;
    setIsLoading(true);
    setAiResponse('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Você é um Professor de Escola especialista em ${subjectName}. 
        O aluno está com dificuldades no seguinte assunto: "${query}".
        Explique de forma didática, clara e paciente, focada no nível escolar.
        IMPORTANTE: Responda APENAS sobre assuntos escolares relacionados a ${subjectName}. 
        Se o aluno perguntar algo fora do contexto escolar ou de outra matéria, gentilmente peça para focar nos estudos de ${subjectName}.`,
      });

      setAiResponse(response.text || 'Desculpe, não consegui gerar uma resposta agora.');
      setMode('ai');
    } catch (error) {
      console.error("Erro na IA do Professor:", error);
      setAiResponse("Ocorreu um erro ao contatar o Professor IA. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const openTodaMateria = () => {
    if (!query.trim() || !selectedSubject) return;
    const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name;
    const searchUrl = `https://www.todamateria.com.br/busca?q=${encodeURIComponent(query + ' ' + subjectName)}`;
    setBrowserUrl(searchUrl);
  };

  const reset = () => {
    setSelectedSubject(null);
    setMode('menu');
    setQuery('');
    setAiResponse('');
    setBrowserUrl(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#fdf6e3] text-[#073642] w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden border-4 border-[#268bd2] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-[#268bd2] text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Portal do Aluno</h2>
                  <p className="text-sm opacity-80 font-medium">Seu assistente de estudos pessoal</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {browserUrl ? (
                <div className="flex-1 flex flex-col bg-white">
                  <div className="p-3 bg-[#eee8d5] border-b border-[#93a1a1]/30 flex items-center space-x-4">
                    <button 
                      onClick={() => setBrowserUrl(null)}
                      className="flex items-center text-sm font-bold text-[#268bd2] hover:underline"
                    >
                      ← Sair do Navegador
                    </button>
                    <div className="flex-1 bg-white rounded-full px-4 py-1.5 text-xs text-gray-500 border border-gray-300 truncate">
                      {browserUrl}
                    </div>
                  </div>
                  <iframe 
                    src={browserUrl} 
                    className="flex-1 w-full border-none"
                    title="Toda Matéria"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {mode === 'menu' && !selectedSubject && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {SUBJECTS.map((subject) => (
                        <motion.button
                          key={subject.id}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedSubject(subject.id)}
                          className="bg-white p-6 rounded-2xl shadow-md border-2 border-transparent hover:border-[#268bd2] transition-all flex flex-col items-center justify-center space-y-3 group"
                        >
                          <span className="text-4xl group-hover:scale-110 transition-transform">{subject.icon}</span>
                          <span className="font-bold text-sm tracking-wide">{subject.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {selectedSubject && mode === 'menu' && (
                    <div className="space-y-6">
                      <button 
                        onClick={() => setSelectedSubject(null)}
                        className="flex items-center text-sm font-bold text-[#268bd2] hover:underline"
                      >
                        ← Voltar para Matérias
                      </button>
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black">Estudando {SUBJECTS.find(s => s.id === selectedSubject)?.name}</h3>
                        <p className="text-sm opacity-70">O que você precisa hoje?</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <button 
                          onClick={() => setMode('help')}
                          className="flex items-center p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-[#268bd2] group"
                        >
                          <div className="bg-red-100 p-4 rounded-xl mr-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <Video className="w-8 h-8" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-lg">Videoaulas</p>
                            <p className="text-sm opacity-60">Encontre os melhores vídeos sobre o assunto</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => setMode('help')}
                          className="flex items-center p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-[#268bd2] group"
                        >
                          <div className="bg-blue-100 p-4 rounded-xl mr-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-lg">Textos e Resumos</p>
                            <p className="text-sm opacity-60">Leituras rápidas e explicações escritas</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => setMode('ai')}
                          className="flex items-center p-6 bg-gradient-to-r from-[#268bd2] to-[#2aa198] text-white rounded-2xl shadow-md hover:shadow-lg transition-all group"
                        >
                          <div className="bg-white/20 p-4 rounded-xl mr-4">
                            <Bot className="w-8 h-8" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-lg">Professor IA</p>
                            <p className="text-sm opacity-80">Tire suas dúvidas agora com nossa inteligência</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {(mode === 'help' || mode === 'ai') && (
                    <div className="space-y-6">
                      <button 
                        onClick={() => setMode('menu')}
                        className="flex items-center text-sm font-bold text-[#268bd2] hover:underline"
                      >
                        ← Voltar para Opções
                      </button>

                      <div className="bg-white p-6 rounded-3xl shadow-inner border-2 border-[#268bd2]/20">
                        <h4 className="font-black text-xl mb-4 flex items-center">
                          {mode === 'ai' ? <Bot className="w-6 h-6 mr-2" /> : <BookOpen className="w-6 h-6 mr-2" />}
                          {mode === 'ai' ? 'Pergunte ao Professor' : 'O que você quer aprender?'}
                        </h4>
                        
                        <div className="flex space-x-2">
                          <input 
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ex: Como resolver equações de 2º grau?"
                            className="flex-1 bg-[#eee8d5] border-2 border-transparent focus:border-[#268bd2] rounded-xl px-4 py-3 outline-none font-medium"
                          />
                          <button 
                            disabled={isLoading}
                            onClick={handleAiHelp}
                            className="bg-[#268bd2] text-white p-3 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
                          >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                          </button>
                        </div>

                        {aiResponse && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-6 bg-[#fdf6e3] border-2 border-[#268bd2]/30 rounded-2xl prose prose-slate max-w-none"
                          >
                            <ReactMarkdown>{aiResponse}</ReactMarkdown>
                          </motion.div>
                        )}

                        {mode === 'help' && !aiResponse && query && (
                          <div className="mt-6 space-y-4">
                            <p className="font-bold text-center opacity-60">Sugestões de estudo:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              <a 
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' ' + SUBJECTS.find(s => s.id === selectedSubject)?.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center hover:scale-105 transition-transform"
                              >
                                <Video className="w-4 h-4 mr-2" /> Ver no YouTube
                              </a>
                              <button 
                                onClick={openTodaMateria}
                                className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center hover:scale-105 transition-transform"
                              >
                                <FileText className="w-4 h-4 mr-2" /> Abrir Toda Matéria Aqui
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#eee8d5] border-t border-[#93a1a1]/30 flex justify-center">
              <button 
                onClick={reset}
                className="text-xs font-black uppercase tracking-widest text-[#586e75] hover:text-[#268bd2] transition-colors"
              >
                Reiniciar Estudo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
