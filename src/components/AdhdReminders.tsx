import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, Plus, X, Check } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface Reminder {
  id: string;
  text: string;
  completed: boolean;
}

export const AdhdReminders: React.FC = () => {
  const { settings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('adhd_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [newReminder, setNewReminder] = useState('');

  useEffect(() => {
    localStorage.setItem('adhd_reminders', JSON.stringify(reminders));
  }, [reminders]);

  if (!settings.adhdFocus) return null;

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    setReminders([{ id: Date.now().toString(), text: newReminder, completed: false }, ...reminders]);
    setNewReminder('');
  };

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg transition-transform hover:scale-105"
        title="Lembretes (TDAH)"
      >
        <StickyNote className="w-6 h-6" />
        {reminders.filter(r => !r.completed).length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-bg-primary">
            {reminders.filter(r => !r.completed).length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-40 w-80 bg-[#fff9c4] rounded-lg shadow-2xl border border-yellow-300 overflow-hidden text-gray-800"
          >
            <div className="p-4 bg-[#fff59d] border-b border-yellow-400 flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-bold flex items-center text-sm">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Meus Lembretes
                </h3>
                <p className="text-[10px] text-gray-600 font-medium mt-0.5">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-600 hover:text-gray-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              <form onSubmit={addReminder} className="mb-4 flex">
                <input
                  type="text"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  placeholder="Não esquecer de..."
                  className="flex-1 bg-white/50 border border-yellow-400 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button type="submit" className="bg-orange-500 text-white px-3 py-2 rounded-r-md hover:bg-orange-600">
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="flex items-start group">
                    <button
                      onClick={() => toggleReminder(reminder.id)}
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mr-3 ${reminder.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}
                    >
                      {reminder.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span className={`flex-1 text-sm ${reminder.completed ? 'line-through text-gray-500' : ''}`}>
                      {reminder.text}
                    </span>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <p className="text-center text-sm text-gray-500 italic mt-4">Nenhum lembrete ativo.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
