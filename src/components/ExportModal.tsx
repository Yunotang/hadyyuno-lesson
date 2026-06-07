import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Book, MoveRight } from 'lucide-react';
import { Course } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  onExport: (courses: Course[]) => void;
  isExporting: boolean;
  activeCourseId?: string;
}

export function ExportModal({ isOpen, onClose, courses, onExport, isExporting, activeCourseId }: ExportModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  React.useEffect(() => {
    if (isOpen && courses.length > 0) {
      if (!selectedCourseId || !courses.some(c => c.id === selectedCourseId)) {
        setSelectedCourseId(activeCourseId || courses[0]?.id || "");
      }
    }
  }, [isOpen, courses, selectedCourseId, activeCourseId]);

  if (!isOpen) return null;

  const handleExport = () => {
    const selected = courses.find(c => c.id === selectedCourseId);
    if (selected) {
      onExport([selected]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in slide-in-from-bottom-8 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800">
            <Download size={20} className="text-green-600" />
            <h2 className="font-bold text-lg">匯出成 Word 檔</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm font-semibold text-slate-500 mb-3">請選擇欲匯出的課程範圍</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {courses.map(course => (
              <label key={course.id} className={`flex items-center justify-between p-4 cursor-pointer rounded-xl border-2 transition-all ${selectedCourseId === course.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                 <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-700 line-clamp-2 leading-tight">{course.title}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5">{course.lessons?.length || 0} 個單元</p>
                 </div>
                 <input type="radio" name="export-target" value={course.id} className="w-5 h-5 shrink-0 text-green-600 border-green-300 accent-green-600" checked={selectedCourseId === course.id} onChange={() => setSelectedCourseId(course.id)} />
              </label>
            ))}
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl shadow-[0_4px_0_0_#15803d] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExporting ? '匯出中...' : '開始匯出'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
