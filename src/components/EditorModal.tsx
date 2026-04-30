import { useState, useEffect } from 'react';
import React from 'react';
import { Modal } from './Modal';
import { Upload, Waypoints, Loader2, Cloud } from 'lucide-react';
import { uploadToDrive } from '../lib/drive';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

interface EditorModalProps {
  type: 'prompt' | 'command' | 'slide' | 'course' | 'lesson' | 'url';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

const TYPE_LABELS: Record<string, string> = {
  prompt: '提示詞',
  command: '指令碼',
  slide: '簡報畫面',
  course: '課程',
  lesson: '單元',
  url: '相關網址'
};

const FieldWrapper = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
    {children}
  </div>
);

export function EditorModal({ type, isOpen, onClose, onSave, initialData }: EditorModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { id: generateId() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Attempt to upload to drive if authorized
    try {
      const driveUrl = await uploadToDrive(file);
      if (driveUrl) {
         handleChange('imageUrl', driveUrl);
         setIsUploading(false);
         return; // successfully uploaded to drive
      }
    } catch (e) {
      console.log('Drive upload failed with error.', e);
      setIsUploading(false);
      return; // Stop on error
    }
    
    // Fall back to Canvas data URL if drive returns null without error
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          handleChange('imageUrl', dataUrl);
          setIsUploading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const driveUrl = await uploadToDrive(file, { isCourseMaterial: true });
      if (driveUrl) {
         handleChange('practiceMaterialUrl', driveUrl);
         setIsUploading(false);
         return; // successfully uploaded to drive
      } else {
        alert("無法上傳至 Google Drive，請確認是否有授權！");
      }
    } catch (e: any) {
      console.log('Drive upload failed with error.', e);
      alert(`上傳檔案失敗：${e.message || "發生未知錯誤"}`);
      setIsUploading(false);
      return; // Stop on error
    }

    setIsUploading(false);
  };

  const renderFields = () => {
    const inputClass = "w-full bg-white border border-[var(--c-border)] rounded-md p-3 text-[var(--c-text)] hover:border-slate-400 focus:outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)] transition-colors text-sm font-sans shadow-sm";

    switch (type) {
      case 'prompt':
        return (
          <>
            <FieldWrapper label="提示詞標題 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：角色扮演提示詞" /></FieldWrapper>
            <FieldWrapper label="提示詞分類 (Category)"><input className={inputClass} value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} placeholder="例如：練習1" /></FieldWrapper>            
            <FieldWrapper label="提示詞內容 (Content)"><textarea className={`${inputClass} min-h-[160px]`} value={formData.content || ''} onChange={(e) => handleChange('content', e.target.value)} placeholder="請輸入完整的提示詞內容..." /></FieldWrapper>
          </>
        );
      case 'command':
        return (
          <>
            <FieldWrapper label="指令標題 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：安裝套件" /></FieldWrapper>
            <FieldWrapper label="指令代碼 (Code)"><textarea className={`${inputClass} min-h-[120px] font-mono whitespace-pre`} value={formData.code || ''} onChange={(e) => handleChange('code', e.target.value)} placeholder="npm install..." /></FieldWrapper>
            <FieldWrapper label="語言 (Language)"><input className={inputClass} value={formData.language || ''} onChange={(e) => handleChange('language', e.target.value)} placeholder="例如：bash, python, json" /></FieldWrapper>
          </>
        );
      case 'slide':
        return (
          <>
            <FieldWrapper label="簡報標題 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：第一章：開場" /></FieldWrapper>
            <FieldWrapper label="分類群組 (Category / Section) - 可選"><input className={inputClass} value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} placeholder="例如：第一節、課前準備..." /></FieldWrapper>
            <FieldWrapper label="圖片截圖或網址 (Image)">
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--c-accent)]/40 hover:border-[var(--c-accent)] rounded-xl cursor-pointer transition-colors relative overflow-hidden bg-[var(--c-bg)]/50">
                  {formData.imageUrl && !isUploading ? (
                     <img src={formData.imageUrl} className="absolute inset-0 w-full h-full object-contain bg-transparent" alt="Preview" />
                  ) : null}
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10 bg-[var(--c-bg)]/80 w-full h-full">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 mb-2 text-[var(--c-accent)] animate-spin" />
                        <p className="text-xs text-[var(--c-accent)] font-bold">上傳至 Google Drive 中...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 text-[var(--c-accent)]/70" />
                        <p className="text-xs text-[var(--c-text)]/90">點擊上傳截圖 / 圖片</p>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
                  <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">或輸入網址</div>
                  <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
                </div>
                <input 
                  className={inputClass} 
                  value={formData.imageUrl || ''} 
                  onChange={(e) => {
                    let val = e.target.value;
                    const driveMatch = val.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                    const driveUcMatch = val.match(/drive\.google\.com\/uc\?export=view&id=([^&]+)/);
                    if (driveMatch && driveMatch[1]) {
                      val = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w2560`;
                    } else if (driveUcMatch && driveUcMatch[1]) {
                      val = `https://drive.google.com/thumbnail?id=${driveUcMatch[1]}&sz=w2560`;
                    }
                    handleChange('imageUrl', val);
                  }} 
                  placeholder="https://... 或 Google Drive 連結" 
                />
              </div>
            </FieldWrapper>
            <FieldWrapper label="附屬代碼抬頭 - 可選 (Code Title)"><input className={inputClass} value={formData.codeTitle || ''} onChange={(e) => handleChange('codeTitle', e.target.value)} placeholder="例如：指令、網址或相關代碼" /></FieldWrapper>
            <FieldWrapper label="附贈指令代碼 - 可選 (Code)"><textarea className={`${inputClass} min-h-[120px] font-mono whitespace-pre`} value={formData.code || ''} onChange={(e) => handleChange('code', e.target.value)} placeholder="npm install..." /></FieldWrapper>
            <FieldWrapper label="代碼語言 - 可選 (Language)"><input className={inputClass} value={formData.language || ''} onChange={(e) => handleChange('language', e.target.value)} placeholder="例如：bash, python, json" /></FieldWrapper>
            
            <div className="mt-4 border-t-2 border-dashed border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-semibold text-slate-700">額外指令 (Extra Commands)</label>
                <button 
                  onClick={() => {
                    const extraCodes = formData.extraCodes || [];
                    handleChange('extraCodes', [...extraCodes, { title: '', code: '', language: '' }]);
                  }}
                  className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  + 新增額外指令
                </button>
              </div>
              
              {(formData.extraCodes || []).map((extra: any, index: number) => (
                <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 relative">
                  <button 
                    onClick={() => {
                      const newExtras = [...formData.extraCodes];
                      newExtras.splice(index, 1);
                      handleChange('extraCodes', newExtras);
                    }}
                    className="absolute top-2 right-2 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">標題</label>
                      <input 
                        className={inputClass} 
                        value={extra.title} 
                        onChange={(e) => {
                          const newExtras = [...formData.extraCodes];
                          newExtras[index].title = e.target.value;
                          handleChange('extraCodes', newExtras);
                        }} 
                        placeholder="例如：第二步指令" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">代碼</label>
                      <textarea 
                        className={`${inputClass} min-h-[80px] font-mono`} 
                        value={extra.code} 
                        onChange={(e) => {
                          const newExtras = [...formData.extraCodes];
                          newExtras[index].code = e.target.value;
                          handleChange('extraCodes', newExtras);
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 'url':
        return (
          <>
            <FieldWrapper label="網址標題 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：專案預覽網址" /></FieldWrapper>
            <FieldWrapper label="網址連結 (URL)"><input className={inputClass} value={formData.url || ''} onChange={(e) => handleChange('url', e.target.value)} placeholder="https://..." /></FieldWrapper>
          </>
        );
      case 'course':
        return (
          <>
            <FieldWrapper label="課程名稱 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：進階 AI 工作坊" /></FieldWrapper>
            <FieldWrapper label="課程描述 (Description)"><textarea className={inputClass} value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder="課程簡介..." /></FieldWrapper>
            <FieldWrapper label="開課日期 (Date)"><input type="date" className={inputClass} value={formData.date || ''} onChange={(e) => handleChange('date', e.target.value)} /></FieldWrapper>
            
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[var(--c-text)]">練習資料上傳 (Practice Material File)</label>
              <div className="border border-[var(--c-border)] rounded-md p-3 relative bg-slate-50">
                 {isUploading ? (
                   <div className="flex items-center gap-2 text-sm text-[var(--c-text-muted)] animate-pulse">
                     <span className="w-4 h-4 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin"></span>
                     上傳至 Google Drive 中...
                   </div>
                 ) : (
                   <input type="file" onChange={handleMaterialUpload} disabled={isUploading} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--c-accent-light)] file:text-[var(--c-accent)] hover:file:bg-[var(--c-accent)] hover:file:text-white" />
                 )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
              <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">或輸入練習資料網址</div>
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
            </div>

            <FieldWrapper label="練習資料連結 (Practice Material URL)"><input className={inputClass} value={formData.practiceMaterialUrl || ''} onChange={(e) => handleChange('practiceMaterialUrl', e.target.value)} placeholder="https://..." disabled={isUploading} /></FieldWrapper>
          </>
        );
      case 'lesson':
        return (
          <>
            <FieldWrapper label="單元名稱 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：第一單元：基礎概念" /></FieldWrapper>
            <FieldWrapper label="單元摘要 (Description)"><textarea className={inputClass} value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder="單元簡介..." /></FieldWrapper>
            <FieldWrapper label="上課日期 (Date)"><input type="date" className={inputClass} value={formData.date || ''} onChange={(e) => handleChange('date', e.target.value)} /></FieldWrapper>
            
            <div className="flex items-center gap-4 mt-6">
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
              <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">課程練習資料 (ZIP/PDF/DOC)</div>
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
            </div>

            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isUploading ? 'border-[var(--c-accent)] bg-blue-50' : 'border-[var(--c-border)] hover:bg-slate-50 hover:border-slate-400'}`}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold text-[var(--c-accent)]">上傳中，請稍後...</p>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-[var(--c-accent)]/10 text-[var(--c-accent)] flex items-center justify-center">
                    <Cloud size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--c-text)]">點擊上傳練習檔案至 Google Drive</p>
                    <p className="text-xs text-[var(--c-text-muted)] mt-1">上傳後將自動產生供學員下載的連結</p>
                  </div>
                  <input type="file" className="hidden" onChange={handleMaterialUpload} accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                </label>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
              <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">或輸入練習資料網址</div>
              <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
            </div>

            <FieldWrapper label="練習資料連結 (Practice Material URL)"><input className={inputClass} value={formData.practiceMaterialUrl || ''} onChange={(e) => handleChange('practiceMaterialUrl', e.target.value)} placeholder="https://..." disabled={isUploading} /></FieldWrapper>

            <FieldWrapper label="視覺標注 (Featured)">
              <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-[var(--c-border)] rounded-xl hover:border-[var(--c-accent)] transition-colors bg-slate-50">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-[var(--c-accent)] cursor-pointer"
                  checked={!!formData.isFeatured}
                  onChange={(e) => handleChange('isFeatured', e.target.checked)}
                />
                <span className="text-sm font-bold text-[var(--c-text)]">重點單元 / 首播</span>
              </label>
            </FieldWrapper>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${initialData ? '編輯' : '新增'} ${TYPE_LABELS[type]}`}>
      <div className="space-y-2">
        {renderFields()}
        <button onClick={handleSave} className="w-full py-3 mt-6 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-white rounded-lg transition-colors text-sm font-medium shadow-sm">
          儲存設定
        </button>
      </div>
    </Modal>
  );
}
