import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, CheckCircle, Trash2, User, Clock, AlertTriangle } from 'lucide-react';
import { Report, UserProfile } from '@/src/types';
import { getReports, updateReportStatus, getUsers } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedReports, fetchedUsers] = await Promise.all([
        getReports(),
        getUsers()
      ]);
      setReports(fetchedReports as Report[]);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching reports data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateReportStatus(reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    } catch (error) {
      console.error("Error updating report status:", error);
    }
  };

  const getUser = (uid: string) => users.find(u => u.uid === uid);

  const filteredReports = reports.filter(r => filter === 'all' || r.status === filter);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-secondary w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl border border-border-primary overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-bg-tertiary">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-color-brand/10 rounded-lg">
                <Shield className="w-6 h-6 text-color-brand" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Central de Denúncias</h2>
                <p className="text-xs text-text-muted">Gerencie as denúncias feitas pelos usuários</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg-secondary rounded-full text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-border-primary flex items-center space-x-2 bg-bg-secondary/50">
            {(['pending', 'resolved', 'dismissed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  filter === f 
                    ? "bg-color-brand text-white shadow-lg shadow-color-brand/20" 
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-primary"
                )}
              >
                {f === 'pending' ? 'Pendentes' : f === 'resolved' ? 'Resolvidas' : f === 'dismissed' ? 'Arquivadas' : 'Todas'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-border-primary">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-color-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-text-muted animate-pulse">Carregando denúncias...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="p-4 bg-bg-tertiary rounded-full">
                  <CheckCircle className="w-12 h-12 text-text-muted opacity-20" />
                </div>
                <div>
                  <p className="text-text-primary font-medium">Nenhuma denúncia encontrada</p>
                  <p className="text-sm text-text-muted">Tudo limpo por aqui!</p>
                </div>
              </div>
            ) : (
              filteredReports.map((report) => {
                const reporter = getUser(report.reporterId);
                const reported = getUser(report.reportedId);
                
                return (
                  <motion.div
                    layout
                    key={report.id}
                    className="bg-bg-tertiary border border-border-primary rounded-xl p-5 hover:border-color-brand/30 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex -space-x-2">
                            <img 
                              src={reporter?.photoURL || 'https://picsum.photos/seed/reporter/40'} 
                              className="w-10 h-10 rounded-full border-2 border-bg-tertiary object-cover"
                              alt="Reporter"
                            />
                            <img 
                              src={reported?.photoURL || 'https://picsum.photos/seed/reported/40'} 
                              className="w-10 h-10 rounded-full border-2 border-bg-tertiary object-cover"
                              alt="Reported"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-text-primary">
                              <span className="font-bold">{reporter?.displayName || 'Usuário'}</span>
                              <span className="text-text-muted mx-2">denunciou</span>
                              <span className="font-bold text-color-error">{reported?.displayName || 'Usuário'}</span>
                            </p>
                            <div className="flex items-center text-[10px] text-text-muted mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(report.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="bg-bg-secondary/50 rounded-lg p-4 border border-border-primary/50">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-color-warning mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-text-secondary leading-relaxed italic">
                              "{report.reason}"
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center gap-2">
                        {report.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              className="flex-1 md:w-32 flex items-center justify-center space-x-2 bg-color-success/10 text-color-success hover:bg-color-success hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Resolver</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                              className="flex-1 md:w-32 flex items-center justify-center space-x-2 bg-bg-primary text-text-secondary hover:bg-bg-secondary px-4 py-2 rounded-lg text-xs font-bold transition-all border border-border-primary"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Arquivar</span>
                            </button>
                          </>
                        ) : (
                          <div className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider",
                            report.status === 'resolved' ? "bg-color-success/20 text-color-success" : "bg-text-muted/20 text-text-muted"
                          )}>
                            {report.status === 'resolved' ? 'Resolvida' : 'Arquivada'}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
