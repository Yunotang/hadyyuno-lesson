import { useState, useEffect } from 'react';
import React from 'react';
import { Modal } from './Modal';
import { Upload, Waypoints, Loader2, Cloud, Trash2 } from 'lucide-react';
import { uploadToDrive } from '../lib/drive';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

interface EditorModalProps {
  type: 'prompt' | 'command' | 'slide' | 'course' | 'lesson' | 'url';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  existingCourses?: import('../types').Course[];
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

export function EditorModal({ type, isOpen, onClose, onSave, initialData, existingCourses }: EditorModalProps) {
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
    const target = e.target;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    let updatedMaterials = [...(formData.materials || [])];
    let hasError = false;
    
    for (const file of files) {
      try {
        const driveUrl = await uploadToDrive(file, { isCourseMaterial: true });
        if (driveUrl) {
          const newMaterial = { id: generateId(), name: file.name, url: driveUrl };
          updatedMaterials.push(newMaterial);
        } else {
          hasError = true;
        }
      } catch (e: any) {
        console.log(`Drive upload failed for ${file.name}.`, e);
        hasError = true;
      }
    }
    
    handleChange('materials', updatedMaterials);

    if (hasError) {
      // alert could be blocked by iframe, so we will avoid confirm
      console.warn("部分檔案上傳失敗至 Google Drive，請確認是否有授權！");
    }

    setIsUploading(false);
    
    // reset input
    target.value = '';
  };

  const renderFields = () => {
    const inputClass = "w-full bg-white border border-[var(--c-border)] rounded-md p-3 text-[var(--c-text)] hover:border-slate-400 focus:outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)] transition-colors text-sm font-sans shadow-sm";

    const renderMaterialsEditor = () => (
      <div className="space-y-3 mt-6">
        <div className="flex items-center gap-4">
          <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
          <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">課程教材 / 練習資料 (可多個)</div>
          <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
        </div>
        
        {(formData.materials?.length > 0 || formData.practiceMaterialUrl) && (
           <div className="space-y-2">
             {formData.practiceMaterialUrl && (
               <div className="flex items-center justify-between p-2 rounded border border-[var(--c-border)] bg-slate-50 text-sm">
                 <span className="truncate text-[var(--c-text)]">舊版連結 (單一)</span>
                 <button onClick={() => handleChange('practiceMaterialUrl', '')} className="text-red-500 hover:bg-red-50 p-1 rounded shrink-0"><Trash2 size={14}/></button>
               </div>
             )}
             {formData.materials?.map((m: any, i: number) => (
               <div key={m.id || i} className="flex flex-col gap-1 p-2 rounded border border-[var(--c-border)] bg-slate-50 text-sm">
                 <div className="flex items-center justify-between">
                    <span className="truncate text-[var(--c-text)] font-semibold">{i + 1}. {m.name}</span>
                    <button onClick={() => {
                      const newMats = [...formData.materials];
                      newMats.splice(i, 1);
                      handleChange('materials', newMats);
                    }} className="text-red-500 hover:bg-red-50 p-1 rounded shrink-0"><Trash2 size={14}/></button>
                 </div>
                 <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate">{m.url}</a>
               </div>
             ))}
           </div>
        )}

        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isUploading ? 'border-[var(--c-accent)] bg-blue-50' : 'border-[var(--c-border)] hover:bg-slate-50 hover:border-slate-400'}`}>
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-4 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-sm text-[var(--c-accent)]">上傳中，請稍後...</p>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[var(--c-accent)]/10 text-[var(--c-accent)] flex items-center justify-center">
                <Cloud size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--c-text)]">上傳新檔案至 Google Drive</p>
              </div>
              <input type="file" multiple className="hidden" onChange={handleMaterialUpload} />
            </label>
          )}
        </div>
        
        <div className="space-y-1 mt-2">
           <label className="text-[12px] font-bold text-[var(--c-text)]">或手動新增外部連結：</label>
           <div className="flex gap-2">
             <input type="text" id="new-mat-name" placeholder="檔案名稱" className="flex-1 bg-white border border-[var(--c-border)] rounded-md p-2 text-xs focus:border-[var(--c-accent)] focus:outline-none" />
             <input type="text" id="new-mat-url" placeholder="https://..." className="flex-1 bg-white border border-[var(--c-border)] rounded-md p-2 text-xs focus:border-[var(--c-accent)] focus:outline-none" />
             <button onClick={() => {
               const nameEl = document.getElementById('new-mat-name') as HTMLInputElement;
               const urlEl = document.getElementById('new-mat-url') as HTMLInputElement;
               if(nameEl.value && urlEl.value) {
                 const newMats = [...(formData.materials || []), { id: generateId(), name: nameEl.value, url: urlEl.value }];
                 handleChange('materials', newMats);
                 nameEl.value = ''; urlEl.value = '';
               }
             }} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-md text-xs font-bold text-slate-700 whitespace-nowrap">加入</button>
           </div>
        </div>
      </div>
    );

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
                    const driveUcMatch = val.match(/drive\.google\.com\/uc.*id=([^&]+)/);
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
            <FieldWrapper label="附屬代碼抬頭 - 可選 (Code Title)">
              <div className="relative">
                <select 
                  className={`${inputClass} appearance-none`} 
                  value={formData.codeTitle || ''} 
                  onChange={(e) => handleChange('codeTitle', e.target.value)}
                >
                  <option value="">請選擇</option>
                  <option value="提示詞">提示詞</option>
                  <option value="指令">指令</option>
                  <option value="網址">網址</option>
                  <option value="其它">其它</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </FieldWrapper>
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
                      <div className="relative">
                        <select 
                          className={`${inputClass} appearance-none`} 
                          value={extra.title} 
                          onChange={(e) => {
                            const newExtras = [...formData.extraCodes];
                            newExtras[index].title = e.target.value;
                            handleChange('extraCodes', newExtras);
                          }}
                        >
                          <option value="">請選擇</option>
                          <option value="提示詞">提示詞</option>
                          <option value="指令">指令</option>
                          <option value="網址">網址</option>
                          <option value="其它">其它</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                      </div>
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
            
            {renderMaterialsEditor()}
          </>
        );
      case 'lesson':
        return (
          <>
            {!initialData && existingCourses && existingCourses.length > 0 && (
              <FieldWrapper label="從現有單元複製內容 (選填, 包含內部連結/步驟)">
                <select 
                  className={inputClass}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    
                    let foundLesson = null;
                    for (const c of existingCourses) {
                      for (const l of c.lessons) {
                         if (l.id === val) {
                           foundLesson = l;
                           break;
                         }
                      }
                      if (foundLesson) break;
                    }
                    
                    if (foundLesson) {
                       const clonedLesson = JSON.parse(JSON.stringify(foundLesson)); // deep clone
                       clonedLesson.id = formData.id; // preserve new id
                       setFormData(clonedLesson);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">選擇要複製的單元...</option>
                  {existingCourses.map(c => (
                    <optgroup key={c.id} label={c.title}>
                       {c.lessons.map(l => (
                          <option key={l.id} value={l.id}>{l.title}</option>
                       ))}
                    </optgroup>
                  ))}
                </select>
              </FieldWrapper>
            )}
            <FieldWrapper label="單元名稱 (Title)"><input className={inputClass} value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="例如：第一單元：基礎概念" /></FieldWrapper>
            <FieldWrapper label="單元摘要 (Description)"><textarea className={inputClass} value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder="單元簡介..." /></FieldWrapper>
            <FieldWrapper label="上課日期 (Date)"><input type="date" className={inputClass} value={formData.date || ''} onChange={(e) => handleChange('date', e.target.value)} /></FieldWrapper>
            
            {renderMaterialsEditor()}
            
            <div className="space-y-3 mt-6 mb-6">
               <div className="flex items-center gap-4">
                 <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
                 <div className="text-[var(--c-accent)]/70 text-[10px] uppercase font-bold tracking-widest">相關連結 (可多個)</div>
                 <div className="h-px bg-[var(--c-accent)]/20 flex-1"></div>
               </div>
               
               {(formData.links?.length > 0) && (
                  <div className="space-y-2">
                    {formData.links?.map((link: any, i: number) => (
                      <div key={link.id || i} className="flex flex-col gap-1 p-2 rounded border border-[var(--c-border)] bg-slate-50 text-sm mt-2">
                        <div className="flex items-center justify-between">
                           <span className="truncate text-[var(--c-text)] font-semibold text-xs">{link.title}</span>
                           <button onClick={() => {
                             const newLinks = [...formData.links];
                             newLinks.splice(i, 1);
                             handleChange('links', newLinks);
                           }} className="text-red-500 hover:bg-red-50 p-1 rounded shrink-0"><Trash2 size={14}/></button>
                        </div>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline truncate break-all">{link.url}</a>
                      </div>
                    ))}
                  </div>
               )}
               
               <div className="space-y-1 mt-2">
                  <div className="flex gap-2">
                    <input type="text" id="new-lesson-link-title" placeholder="連結說明 (例如: 官方網站)" className="flex-1 bg-white border border-[var(--c-border)] rounded-md p-2 text-xs focus:border-[var(--c-accent)] focus:outline-none" />
                    <input type="text" id="new-lesson-link-url" placeholder="https://..." className="flex-1 bg-white border border-[var(--c-border)] rounded-md p-2 text-xs focus:border-[var(--c-accent)] focus:outline-none" />
                    <button onClick={() => {
                      const titleEl = document.getElementById('new-lesson-link-title') as HTMLInputElement;
                      const urlEl = document.getElementById('new-lesson-link-url') as HTMLInputElement;
                      if(titleEl.value && urlEl.value) {
                        const newLinks = [...(formData.links || []), { id: generateId(), title: titleEl.value, url: urlEl.value }];
                        handleChange('links', newLinks);
                        titleEl.value = ''; urlEl.value = '';
                      }
                    }} className="px-3 py-2 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-white rounded-md text-xs font-bold whitespace-nowrap">新增連結</button>
                  </div>
               </div>
            </div>

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
