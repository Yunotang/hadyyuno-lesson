import { Book, ChevronRight, ChevronDown, GraduationCap, Plus, Trash2, Edit2, Eye, EyeOff, ArrowUp, ArrowDown, Download, Users, UserCheck, PlusSquare, MinusSquare } from 'lucide-react';
import { Course, Lesson } from '../types';
import { useState } from 'react';
import React from 'react';
import { EditorModal } from './EditorModal';
import { Modal } from './Modal';
import { saveCourseToCloud, saveLessonToCloud, deleteCourseFromCloud, deleteLessonFromCloud } from '../lib/firebase';

interface SidebarProps {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  editMode: boolean;
  totalVisits: number;
}

export function Sidebar({ courses, setCourses, activeLessonId, onSelectLesson, editMode, totalVisits }: SidebarProps) {
  const [modalType, setModalType] = useState<'course' | 'lesson' | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'course' | 'lesson', courseId: string, lessonId?: string} | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (activeLessonId) {
      const course = courses.find(c => c.lessons.some(l => l.id === activeLessonId));
      if (course) {
        setExpandedCourses(prev => {
          if (!prev[course.id]) {
            return { ...prev, [course.id]: true };
          }
          return prev;
        });
      }
    }
  }, [activeLessonId, courses]);

  const toggleCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleSaveCourse = async (data: any) => {
    let updatedCourses = courses;
    if (editingData) {
      updatedCourses = courses.map(c => c.id === data.id ? { ...c, title: data.title, description: data.description, date: data.date, practiceMaterialUrl: data.practiceMaterialUrl } : c);
    } else {
      updatedCourses = [...courses, { ...data, lessons: [] }];
    }
    setCourses(updatedCourses);
    
    if (editMode) {
      const courseToSave = updatedCourses.find(c => c.id === data.id);
      if (courseToSave) await saveCourseToCloud(courseToSave);
    }
    
    setModalType(null);
    setEditingData(null);
  };

  const handleSaveLesson = async (data: any) => {
    let updatedCourses = courses;
    if (editingData) {
      updatedCourses = courses.map(c => c.id === activeCourseId ? { ...c, lessons: c.lessons.map(l => l.id === data.id ? { ...l, title: data.title, description: data.description, date: data.date, isFeatured: data.isFeatured, practiceMaterialUrl: data.practiceMaterialUrl } : l) } : c);
    } else {
      updatedCourses = courses.map(c => c.id === activeCourseId ? { ...c, lessons: [...c.lessons, { ...data, slides: [], commands: [], prompts: [], urls: [], enabledTabs: [], tabOrder: ['slides', 'urls', 'commands', 'prompts', 'flow'] }] } : c);
    }
    setCourses(updatedCourses);

    if (editMode && activeCourseId) {
      const parentCourse = updatedCourses.find(c => c.id === activeCourseId);
      const lessonToSave = parentCourse?.lessons.find(l => l.id === data.id);
      if(lessonToSave) await saveLessonToCloud(lessonToSave, activeCourseId);
    }

    setModalType(null);
    setEditingData(null);
  };

  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ type: 'course', courseId: id });
  };

  const executeDeleteCourse = async (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
    if (courses.find(c => c.id === id)?.lessons.some(l => l.id === activeLessonId)) {
       onSelectLesson('');
    }
    if (editMode) {
      await deleteCourseFromCloud(id);
    }
    setDeleteConfirm(null);
  };

  const handleDeleteLesson = async (courseId: string, lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ type: 'lesson', courseId, lessonId });
  };

  const executeDeleteLesson = async (courseId: string, lessonId: string) => {
    setCourses(courses.map(c => c.id === courseId ? { ...c, lessons: c.lessons.filter(l => l.id !== lessonId) } : c));
    if (activeLessonId === lessonId) onSelectLesson('');
    
    if (editMode) {
      await deleteLessonFromCloud(lessonId);
    }
    setDeleteConfirm(null);
  };

  const toggleCourseVisibility = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCourses = courses.map(c => c.id === courseId ? { ...c, isVisible: c.isVisible === false ? true : false } : c);
    setCourses(updatedCourses);
    if (editMode) {
      const courseToSave = updatedCourses.find(c => c.id === courseId);
      if (courseToSave) await saveCourseToCloud(courseToSave);
    }
  };

  const toggleLessonVisibility = async (courseId: string, lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCourses = courses.map(c => c.id === courseId ? { ...c, lessons: c.lessons.map(l => l.id === lessonId ? { ...l, isVisible: l.isVisible === false ? true : false } : l) } : c);
    setCourses(updatedCourses);
    if (editMode) {
      const parentCourse = updatedCourses.find(c => c.id === courseId);
      const lessonToSave = parentCourse?.lessons.find(l => l.id === lessonId);
      if(lessonToSave) await saveLessonToCloud(lessonToSave, courseId);
    }
  };

  const handleMoveCourse = async (courseId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (
      (direction === 'up' && courseIndex === 0) || 
      (direction === 'down' && courseIndex === courses.length - 1)
    ) return;

    const newCourses = [...courses];
    const targetIndex = direction === 'up' ? courseIndex - 1 : courseIndex + 1;
    
    const temp = newCourses[courseIndex];
    newCourses[courseIndex] = newCourses[targetIndex];
    newCourses[targetIndex] = temp;
    
    newCourses.forEach((c, idx) => {
      c.order = idx;
    });
    
    setCourses(newCourses);
    
    if (editMode) {
      await saveCourseToCloud(newCourses[courseIndex]);
      await saveCourseToCloud(newCourses[targetIndex]);
    }
  };

  const handleMoveLesson = async (courseId: string, lessonId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) return;
    
    const course = courses[courseIndex];
    const lessonIndex = course.lessons.findIndex(l => l.id === lessonId);
    if (
      (direction === 'up' && lessonIndex === 0) || 
      (direction === 'down' && lessonIndex === course.lessons.length - 1)
    ) return;

    const newLessons = [...course.lessons];
    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;
    
    newLessons.forEach((l, idx) => {
      l.order = idx;
    });
    
    const newCourses = [...courses];
    newCourses[courseIndex] = { ...course, lessons: newLessons };
    setCourses(newCourses);
    
    if (editMode) {
      await saveLessonToCloud(newLessons[lessonIndex], courseId);
      await saveLessonToCloud(newLessons[targetIndex], courseId);
    }
  };

  return (
    <div className="w-80 border-r border-[var(--c-border)] bg-[var(--c-surface)] h-screen overflow-y-auto hidden md:flex flex-col sticky top-0 relative">
      <div className="p-6 border-b-2 border-b-[var(--c-border)] sticky top-0 z-10 bg-[var(--c-surface)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-[var(--c-text)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--c-accent)] text-white flex items-center justify-center border-2 border-[var(--c-border)] shadow-[0_3px_0_0_var(--c-border)] shrink-0">
              <GraduationCap size={20} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h1 className="font-extrabold tracking-wide text-lg text-[var(--c-text)] truncate">Hady(YuNo)教學工具箱</h1>
              {totalVisits > 0 && (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-[var(--c-text-muted)] bg-slate-50 border border-[var(--c-border)] rounded-md px-1.5 py-0.5 w-max">
                  <Users size={10} className="text-[var(--c-accent)]" />
                  <span>總造訪人數: {totalVisits}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {courses.filter(c => editMode || c.isVisible !== false).map((course) => (
          <div key={course.id} className={`space-y-2 ${course.isVisible === false && editMode ? 'opacity-60' : ''}`}>
            <div className="px-2 mb-3 mt-4 flex items-start gap-2 group relative">
              <button 
                className="mt-0.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors shrink-0 outline-none"
                onClick={(e) => toggleCourse(course.id, e)}
                title={expandedCourses[course.id] ? "隱藏單元" : "展開單元"}
              >
                {expandedCourses[course.id] ? <MinusSquare size={16} className="text-red-600" /> : <PlusSquare size={16} />}
              </button>
              <div className="flex flex-col flex-1 cursor-pointer" onClick={(e) => toggleCourse(course.id, e)}>
                <h2 className="mono-label !mb-0 text-[var(--c-text)]">
                  {course.title} {course.isVisible === false && <span className="text-amber-500 ml-1">(已隱藏)</span>}
                </h2>
                {course.practiceMaterialUrl && (
                  <a href={course.practiceMaterialUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-center gap-1.5 w-fit rounded-full px-3 py-1 bg-white border border-[var(--c-border)] text-xs font-bold text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:border-[var(--c-accent)] shadow-sm transition-all" onClick={e => e.stopPropagation()}>
                    <Download size={12} strokeWidth={2.5} /> 下載課程練習資料
                  </a>
                )}
                {course.date && (
                  <span className="text-[11px] text-[var(--c-text-muted)] mt-0.5 block">
                    {course.date}
                  </span>
                )}
              </div>
              {editMode && (
                <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 flex gap-1 bg-[var(--c-surface)] pl-2">
                  <button onClick={(e) => handleMoveCourse(course.id, 'up', e)} disabled={courses.findIndex(c => c.id === course.id) === 0} className="p-1 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-blue-500 transition-colors" title="上移">
                    <ArrowUp size={12} />
                  </button>
                  <button onClick={(e) => handleMoveCourse(course.id, 'down', e)} disabled={courses.findIndex(c => c.id === course.id) === courses.length - 1} className="p-1 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-blue-500 transition-colors" title="下移">
                    <ArrowDown size={12} />
                  </button>
                  <button onClick={(e) => toggleCourseVisibility(course.id, e)} className="p-1 text-[var(--c-text-muted)] hover:text-amber-500 transition-colors" title={course.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                    {course.isVisible === false ? <EyeOff size={12} className="text-amber-500" /> : <Eye size={12} className="text-emerald-500" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveCourseId(course.id); setEditingData(course); setModalType('course'); }} className="p-1 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={(e) => handleDeleteCourse(course.id, e)} className="p-1 text-[var(--c-text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
            {expandedCourses[course.id] && (
            <ul className="space-y-1">
              {course.lessons.filter(l => editMode || l.isVisible !== false).map((lesson) => {
                const isActive = lesson.id === activeLessonId;
                const isFeatured = lesson.isFeatured;
                return (
                  <li key={lesson.id} className={`relative group/lesson ${lesson.isVisible === false && editMode ? 'opacity-60' : ''}`}>
                    <div
                      onClick={() => onSelectLesson(lesson.id)}
                      className={`w-full text-left rounded-xl transition-all cursor-pointer flex flex-col font-bold border-2 overflow-hidden ${
                        isActive 
                          ? 'bg-[var(--c-accent-light)] border-[var(--c-accent)] text-[var(--c-accent)] shadow-[0_3px_0_0_var(--c-accent)] translate-y-[-2px]' 
                          : isFeatured 
                            ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-[0_3px_0_0_#fcd34d] hover:bg-amber-100 hover:translate-y-[-2px]'
                            : 'border-transparent text-[var(--c-text-muted)] hover:bg-slate-100 hover:text-[var(--c-text)] hover:border-[var(--c-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="flex items-start gap-2 text-sm break-words whitespace-normal py-0.5 flex-1 min-w-0">
                          {isFeatured && <span className="flex w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_0_3px_rgba(251,191,36,0.3)] shrink-0 mt-[6px]" />}
                          <span className="break-all leading-snug">{lesson.title} {lesson.isVisible === false && <span className="text-amber-500 ml-1 shrink-0 whitespace-nowrap">(已隱藏)</span>}</span>
                        </span>
                        {isActive && !editMode && <ChevronRight size={14} className="text-[var(--c-accent)] shrink-0" />}
                      </div>
                      
                      {lesson.practiceMaterialUrl && (
                        <a href={lesson.practiceMaterialUrl} target="_blank" rel="noopener noreferrer" className={`flex w-full items-center justify-center gap-1.5 px-4 py-2 border-t transition-all text-xs font-bold ${isActive ? 'bg-[var(--c-accent)] border-[var(--c-accent)] text-white hover:bg-[var(--c-accent-hover,var(--c-accent))] hover:brightness-110' : isFeatured ? 'bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200' : 'bg-slate-50 border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-slate-100 hover:text-[var(--c-accent)]'}`} onClick={e => e.stopPropagation()}>
                          <Download size={14} strokeWidth={2.5} /> 下載練習資料
                        </a>
                      )}
                    </div>
                    {editMode && (
                       <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/lesson:opacity-100 flex items-center gap-1 z-20">
                         <button onClick={(e) => handleMoveLesson(course.id, lesson.id, 'up', e)} disabled={course.lessons.findIndex(l => l.id === lesson.id) === 0} className="p-1.5 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-blue-500 bg-white border border-[var(--c-border)] rounded-md shadow-sm transition-all" title="上移">
                           <ArrowUp size={12} />
                         </button>
                         <button onClick={(e) => handleMoveLesson(course.id, lesson.id, 'down', e)} disabled={course.lessons.findIndex(l => l.id === lesson.id) === course.lessons.length - 1} className="p-1.5 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-blue-500 bg-white border border-[var(--c-border)] rounded-md shadow-sm transition-all" title="下移">
                           <ArrowDown size={12} />
                         </button>
                         <button onClick={(e) => toggleLessonVisibility(course.id, lesson.id, e)} className="p-1.5 text-[var(--c-text-muted)] hover:text-amber-500 bg-white border border-[var(--c-border)] rounded-md shadow-sm transition-all" title={lesson.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                           {lesson.isVisible === false ? <EyeOff size={12} className="text-amber-500" /> : <Eye size={12} className="text-emerald-500" />}
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); setActiveCourseId(course.id); setEditingData(lesson); setModalType('lesson'); }} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] bg-white border border-[var(--c-border)] rounded-md shadow-sm transition-all">
                           <Edit2 size={12} />
                         </button>
                         <button onClick={(e) => handleDeleteLesson(course.id, lesson.id, e)} className="p-1.5 text-[var(--c-text-muted)] hover:text-red-600 bg-white border border-[var(--c-border)] rounded-md shadow-sm transition-all">
                           <Trash2 size={12} />
                         </button>
                       </div>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
            {editMode && (
              <button 
                onClick={() => { setActiveCourseId(course.id); setEditingData(null); setModalType('lesson'); }} 
                className="w-full mt-3 py-2.5 border-2 border-dashed border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-light)] font-bold text-sm transition-all flex justify-center items-center gap-1 rounded-xl"
              >
                <Plus size={16} strokeWidth={3} /> 新增單元
              </button>
            )}
          </div>
        ))}

        {editMode && (
          <div className="pt-6 border-t-2 border-[var(--c-border)]">
            <button 
              onClick={() => { setEditingData(null); setModalType('course'); }} 
              className="w-full py-3.5 bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-hover)] hover:-translate-y-0.5 transition-all text-sm font-extrabold flex justify-center items-center gap-2 rounded-xl border-2 border-[var(--c-border)] shadow-[0_4px_0_0_var(--c-border)]"
            >
              <Plus size={18} strokeWidth={3} /> 新增課程系列
            </button>
          </div>
        )}
      </div>

      <EditorModal 
         type="course"
         initialData={editingData}
         isOpen={modalType === 'course'} 
         onClose={() => { setModalType(null); setEditingData(null); }} 
         onSave={handleSaveCourse} 
      />
      <EditorModal 
         type="lesson"
         initialData={editingData}
         existingCourses={courses}
         isOpen={modalType === 'lesson'} 
         onClose={() => { setModalType(null); setEditingData(null); }} 
         onSave={handleSaveLesson} 
      />

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm?.type === 'course' ? '刪除課程系列' : '刪除單元'}
      >
        <div className="space-y-4 pt-2">
          <p className="text-[var(--c-text)] font-medium">
            確定要刪除這個{deleteConfirm?.type === 'course' ? '整個課程系列及其下所有單元' : '單元'}嗎？<br/>此操作無法復原。
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border-2 border-[var(--c-border)] rounded-lg text-sm font-bold text-[var(--c-text-muted)] hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (deleteConfirm?.type === 'course') {
                  executeDeleteCourse(deleteConfirm.courseId);
                } else if (deleteConfirm?.type === 'lesson' && deleteConfirm.lessonId) {
                  executeDeleteLesson(deleteConfirm.courseId, deleteConfirm.lessonId);
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 border-2 border-red-600 rounded-lg text-sm font-bold text-white transition-colors"
            >
              確定刪除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
