/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { LessonView } from './components/LessonView';
import { EditorModal } from './components/EditorModal';
import { PasswordModal } from './components/PasswordModal';
import { ExportModal } from './components/ExportModal';
import { mockCourses } from './data/mockData';
import { Menu, X, Settings2, Loader2, Download, Users, Trophy, MessageCircle, AlertCircle, Sparkles, MinusSquare, PlusSquare, StickyNote } from 'lucide-react';
import { Course } from './types';
import { getItem, setItem } from './lib/db';
import { fetchFromCloud, syncToCloud, logout, saveLessonToCloud, useVisitorStats, useSystemSettings } from './lib/firebase';

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedCourses, setMobileExpandedCourses] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const { totalVisits } = useVisitorStats();
  const { settings } = useSystemSettings();

  useEffect(() => {
    if (activeLessonId) {
      const course = courses.find(c => c.lessons.some(l => l.id === activeLessonId));
      if (course) {
        setMobileExpandedCourses(prev => ({ ...prev, [course.id]: true }));
      }
    }
  }, [activeLessonId, courses]);

// Load data asynchronously on mount
  useEffect(() => {
    setIsLoading(true);
    fetchFromCloud(editMode).then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        setCourses(cloudData);
        setItem('teaching-toolkit-data', cloudData).catch(console.error); // sync to local
        setIsLoading(false);
      } else {
        // Fallback to local IndexedDB
        getItem<Course[]>('teaching-toolkit-data').then((saved) => {
          if (saved && saved.length > 0) {
            setCourses(saved);
          } else {
            // Fallback to local storage
            const localSaved = localStorage.getItem('teaching-toolkit-data');
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              setCourses(parsed);
              setItem('teaching-toolkit-data', parsed).catch(console.error);
            } else {
              setCourses(mockCourses);
            }
          }
          setIsLoading(false);
        }).catch(err => {
          console.error("Failed to load from IndexedDB:", err);
          setCourses(mockCourses);
          setIsLoading(false);
        });
      }
    });
  }, [editMode]);

  // Save data to IndexedDB whenever courses array changes, but only after initial load is done
  useEffect(() => {
    if (!isLoading && courses.length > 0) {
      setItem('teaching-toolkit-data', courses).catch(console.error);
    }
  }, [courses, isLoading]);

  // Sort courses and lessons: Featured first, then by date descending
  const sortedCourses = useMemo(() => {
    let baseCourses = courses;
    if (!editMode) {
      baseCourses = courses
        .filter(c => c.isVisible !== false)
        .map(c => ({
          ...c,
          lessons: c.lessons.filter(l => l.isVisible !== false)
        }));
    }

    return [...baseCourses]
      .map(course => ({
        ...course,
        lessons: [...course.lessons].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          
          const aOrder = typeof a.order === 'number' ? a.order : 99999;
          const bOrder = typeof b.order === 'number' ? b.order : 99999;
          if (aOrder !== bOrder) return aOrder - bOrder;

          return new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime();
        })
      }))
      .sort((a, b) => {
          const aOrder = typeof a.order === 'number' ? a.order : 99999;
          const bOrder = typeof b.order === 'number' ? b.order : 99999;
          if (aOrder !== bOrder) return aOrder - bOrder;

          return new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime();
      });
  }, [courses, editMode]);

  // Set default or saved active lesson once courses are loaded
  useEffect(() => {
    if (!isLoading && sortedCourses.length > 0) {
      const savedId = localStorage.getItem('last-active-lesson-id');
      const savedExists = savedId && sortedCourses.some(c => c.lessons.some(l => l.id === savedId));
      const currentExists = activeLessonId && sortedCourses.some(c => c.lessons.some(l => l.id === activeLessonId));
      
      if (!currentExists) {
        if (savedExists) {
          setActiveLessonId(savedId);
        } else {
          setActiveLessonId(sortedCourses[0]?.lessons[0]?.id || '');
        }
      }
    }
  }, [isLoading, sortedCourses, activeLessonId]);

  // Save active lesson ID to local storage when it changes
  useEffect(() => {
    if (activeLessonId) {
      localStorage.setItem('last-active-lesson-id', activeLessonId);
    }
  }, [activeLessonId]);

  // find active content
  const activeCourse = useMemo(() => sortedCourses.find(c => c.lessons.some(l => l.id === activeLessonId)), [sortedCourses, activeLessonId]);
  const activeLesson = useMemo(() => activeCourse?.lessons.find(l => l.id === activeLessonId), [activeCourse, activeLessonId]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportWord = async (coursesToExport: Course[]) => {
    setIsExporting(true);
    try {
      const { exportAllToWord } = await import('./lib/exportWord');
      let fileName = 'Hady(YuNo)教學工具箱';
      if (coursesToExport.length === 1 && coursesToExport[0].title) {
        fileName = coursesToExport[0].title;
      }

      const suffix = coursesToExport.length > 1 ? '_所有單元' : '';
      await exportAllToWord(coursesToExport, editMode, `${fileName}${suffix}.docx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Export to Word failed", err);
      alert("匯出匯出失敗，請重試！");
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateLesson = (updatedLesson: any) => {
    setCourses(courses => courses.map(c => ({
      ...c,
      lessons: c.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
    })));
    if (activeCourse && editMode) {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        Promise.race([
          saveLessonToCloud(updatedLesson, activeCourse.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ])
          .then(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          })
          .catch((err) => {
            console.error(err);
            setSaveStatus('idle');
            if (err.message === 'timeout') {
              console.warn('儲存時間過長，部分內容可能尚未同步完成，建議稍後再試。');
            }
          });
      }, 2000); // reduced slightly to feel responsive but prevent exhaustion
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--c-bg)] text-[var(--c-accent)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[var(--c-accent)]" />
          <p className="font-black tracking-widest text-sm text-[var(--c-text-muted)]">資料讀取中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] font-sans relative overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--c-surface)] border-b border-[var(--c-border)] flex items-center justify-between px-4 z-50">
        <div className="flex flex-col">
           <h1 className="font-extrabold tracking-wide text-[var(--c-text)]">Hady(YuNo)教學工具箱</h1>
           {totalVisits > 0 && <span className="text-[10px] text-[var(--c-text-muted)] font-medium">總造訪人數: {totalVisits}</span>}
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all duration-300 ${
              saveStatus === 'saving' ? 'bg-amber-100 text-amber-700' :
              saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700' :
              'opacity-0'
            }`}>
              {saveStatus === 'saving' ? '儲存中...' : '已儲存'}
            </span>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--c-text-muted)] hover:bg-slate-50 rounded-md transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-[var(--c-surface)] border-b border-[var(--c-border)] shadow-lg z-40 max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Mobile Read Mode Buttons */}
            {!editMode && (settings?.advancedWorksUrl || settings?.discussionForumUrl || settings?.globalPracticeMaterialUrl || settings?.messageBoardUrl) && (
              <div className="flex flex-col gap-2 pb-4 border-b border-[var(--c-border)]">
                {settings?.globalPracticeMaterialUrl && (
                  <a href={settings.globalPracticeMaterialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-2 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-[13px] font-bold shadow-sm transition-all text-center">
                    <span className="tracking-wide">下載舊版共用檔案</span>
                  </a>
                )}
                {settings?.advancedWorksUrl && (
                  <a href={settings.advancedWorksUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-[13px] font-bold shadow-sm transition-all text-center">
                    <span className="tracking-wide">同學作品區</span>
                  </a>
                )}
                {settings?.discussionForumUrl && (
                  <a href={settings.discussionForumUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-2.5 px-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg text-[13px] font-bold shadow-sm transition-all text-center">
                    <span className="tracking-wide">Teams知識分享區</span>
                  </a>
                )}
                {settings?.messageBoardUrl && (
                  <a href={settings.messageBoardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-2.5 px-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-lg text-[13px] font-bold shadow-sm transition-all text-center">
                    <span className="tracking-wide">給Hady回饋或敲碗</span>
                  </a>
                )}
              </div>
            )}
            
            {/* Mobile Global Materials */}
            {!editMode && settings?.globalMaterials && settings.globalMaterials.length > 0 && (
              <div className="pb-4 border-b border-[var(--c-border)]">
                {(() => {
                  const mats = settings.globalMaterials;
                  const prepKeywords = ['課前', '安裝', '必讀', '懶人包', '準備', '須知'];
                  const prepMaterials = mats.filter(m => prepKeywords.some(k => m.name.includes(k)));
                  const regularMaterials = mats.filter(m => !prepKeywords.some(k => m.name.includes(k)));

                  return (
                    <div className="flex flex-col gap-2">
                      {settings?.globalMaterialsDescription && (
                        <div className="text-xs font-semibold text-slate-500 flex items-start px-2">
                          <span className="leading-tight">{settings.globalMaterialsDescription}</span>
                        </div>
                      )}
                      
                      {prepMaterials.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-200 rounded p-2 relative overflow-hidden">
                          <h3 className="text-xs font-black text-amber-800 mb-2 flex items-center gap-1 tracking-wide"><Sparkles size={12} className="text-orange-500" /> 課前必備與安裝</h3>
                          <div className="flex flex-col gap-1.5 w-full">
                            {prepMaterials.map((m: any, i: number) => (
                              <a key={m.id || i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full py-1.5 px-2 rounded bg-white hover:bg-amber-100/50 text-xs font-bold text-amber-800 border border-amber-200 shadow-sm">
                                <Download size={14} className="shrink-0 text-orange-500" /> 
                                <span className="flex-1 truncate">
                                  {m.name}
                                  {m.remark && <span className="text-[10px] text-orange-500 shrink-0 ml-1">({m.remark})</span>}
                                </span>
                                <span className="shrink-0 text-[10px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 rounded ml-1">必讀</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {regularMaterials.length > 0 && (
                        <div className="flex flex-col mt-1">
                          {prepMaterials.length > 0 && <h3 className="text-xs font-extrabold text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">📚 其他資源</h3>}
                          <div className="flex flex-wrap gap-1.5 w-full">
                            {regularMaterials.map((m: any, i: number) => (
                              <a key={m.id || i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 w-full py-1.5 px-2 bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded text-xs font-semibold shadow-sm overflow-hidden">
                                <Download size={14} className="shrink-0" /> 
                                <span className="truncate">
                                  {m.name}
                                  {m.remark && <span className="text-[10px] text-indigo-400 shrink-0 ml-1">({m.remark})</span>}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {sortedCourses.map((course) => (
              <div key={course.id}>
                <div 
                  className={`mono-label mb-2 px-2 flex items-center justify-between cursor-pointer ${course.isVisible === false && editMode ? 'text-amber-500 opacity-60' : ''}`}
                  onClick={() => setMobileExpandedCourses(prev => ({ ...prev, [course.id]: !prev[course.id] }))}
                >
                  <span className="flex-1 truncate">{course.title} {course.isVisible === false && editMode && '(已隱藏)'}</span>
                  <button className="text-[var(--c-text-muted)] p-1 -mr-1">
                    {mobileExpandedCourses[course.id] ? <MinusSquare size={14} /> : <PlusSquare size={14} />}
                  </button>
                </div>
                {mobileExpandedCourses[course.id] && (
                <div className="space-y-1">
                  {course.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setActiveLessonId(lesson.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        lesson.id === activeLessonId 
                          ? 'bg-[var(--c-accent-light)] text-[var(--c-accent)]' 
                          : 'text-[var(--c-text-muted)] hover:bg-slate-50 hover:text-[var(--c-text)]'
                      } ${lesson.isVisible === false && editMode ? 'opacity-60 grayscale' : ''}`}
                    >
                      {lesson.title} {lesson.isVisible === false && editMode && <span className="text-amber-500 font-bold ml-1">(已隱藏)</span>}
                    </button>
                  ))}
                </div>
                )}
              </div>
            ))}
            
          </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <Sidebar 
        courses={sortedCourses}
        setCourses={setCourses}
        activeLessonId={activeLessonId} 
        onSelectLesson={setActiveLessonId} 
        editMode={editMode}
        totalVisits={totalVisits}
      />

      {/* Main Content */}
      <main className="flex-1 w-full flex justify-center p-6 pt-24 md:p-10 relative z-10 min-w-0 overflow-y-auto h-screen">
        <div className="absolute top-6 right-6 z-50 hidden md:flex items-center gap-3">
          {editMode && (
            <div className="flex items-center">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-300 ${
                saveStatus === 'saving' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                'opacity-0 scale-95'
              }`}>
                {saveStatus === 'saving' ? '儲存中...' : '已自動儲存'}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl border-2 bg-green-600 border-green-700 text-white hover:bg-green-500 hover:-translate-y-0.5 shadow-[0_4px_0_0_#15803d] ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? '匯出中...' : '匯出課程(Word)'}
          </button>
          {editMode && (
            <button
              onClick={() => {
                setIsLoading(true);
                syncToCloud(courses).then(() => {
                  alert('資料已成功同步至雲端！其他人重新整理後即可看見新資料。');
                  setIsLoading(false);
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl border-2 bg-blue-600 border-blue-700 text-white hover:bg-blue-500 hover:-translate-y-0.5 shadow-[0_4px_0_0_#1d4ed8]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              同步並修復資料
            </button>
          )}
          <button 
             onClick={() => {
               if(editMode) {
                 setEditMode(false);
                 logout();
               } else {
                 setShowPasswordModal(true);
               }
             }}
             title={editMode ? '退出管理模式' : '進入管理模式'}
             className={`flex items-center justify-center w-10 h-10 transition-all rounded-xl border-2 ${
               editMode 
                 ? 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700 hover:-translate-y-0.5 shadow-[0_4px_0_0_#0f172a]' 
                 : 'bg-transparent border-transparent text-[var(--c-text-muted)] hover:bg-slate-100 hover:text-[var(--c-text)] opacity-50 hover:opacity-100'
             }`}
           >
             <Settings2 size={18} />
           </button>
        </div>

        <div className="w-full max-w-5xl relative z-10">
          {activeLesson ? (
            <LessonView 
              lesson={activeLesson} 
              editMode={editMode} 
              onUpdateLesson={handleUpdateLesson} 
              courseTitle={activeCourse?.title}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--c-text-muted)]">
              <p className="font-medium text-lg">請選擇一堂課程以檢視內容</p>
            </div>
          )}
        </div>
      </main>

      {/* Password Modal */}
      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => setEditMode(true)}
      />

      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        courses={sortedCourses}
        onExport={handleExportWord}
        isExporting={isExporting}
        activeCourseId={activeCourse?.id}
      />
    </div>
  );
}

