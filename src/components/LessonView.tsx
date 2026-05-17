import { motion } from 'motion/react';
import { Terminal, Lightbulb, Presentation, Edit2, Trash2, Plus, LayoutList, Upload, Eye, EyeOff, Link, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Waypoints, FileText } from 'lucide-react';
import { Lesson } from '../types';
import { CopyButton } from './CopyButton';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EditorModal } from './EditorModal';
import { Modal } from './Modal';
import { Download, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MarkdownFlow } from './MarkdownFlow';

interface LessonViewProps {
  lesson: Lesson;
  editMode: boolean;
  onUpdateLesson: (updatedLesson: Lesson) => void;
  courseTitle?: string;
}

export function LessonView({ lesson, editMode, onUpdateLesson, courseTitle }: LessonViewProps) {
  const renderWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline break-all" onClick={e => e.stopPropagation()}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: any; initialData?: any; listKey?: string }>({ isOpen: false, type: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ listKey: string, id: string } | null>(null);
  const [deleteStepConfirm, setDeleteStepConfirm] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'slides' | 'urls' | 'commands' | 'prompts' | 'flow'>('slides');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activePromptCategory, setActivePromptCategory] = useState<string>('練習1');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const normalizedSteps = lesson.steps && lesson.steps.length > 0 ? lesson.steps : [{
    id: 'legacy-step',
    title: lesson.flowTitle || '單元內容',
    slides: lesson.slides || [],
    urls: lesson.urls || [],
    commands: lesson.commands || [],
    prompts: lesson.prompts || [],
    flowMarkdown: lesson.flowMarkdown || '',
    enabledTabs: lesson.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'],
    tabOrder: lesson.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'],
    flowTitle: lesson.flowTitle
  }];

  useEffect(() => {
    if (!activeStepId || !normalizedSteps.find(s => s.id === activeStepId)) {
      setActiveStepId(normalizedSteps[0]?.id || '');
    }
  }, [lesson.id, normalizedSteps.length, activeStepId]);

  const activeData = normalizedSteps.find(s => s.id === activeStepId) || normalizedSteps[0];

  const updateActiveStep = (updatedData: any) => {
    const newSteps = normalizedSteps.map(s => s.id === activeData.id ? { ...s, ...updatedData } : s);
    onUpdateLesson({
      ...lesson,
      steps: newSteps
    });
  };

  // Switch tab gracefully when changing steps
  useEffect(() => {
    if (!activeData) return;
    const enabled = activeData.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'];
    const order = activeData.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'];
    const missing = (['slides', 'urls', 'commands', 'prompts', 'flow'] as const).filter(id => !order.includes(id as any));
    const fullOrder = [...order, ...missing];
    
    // We want the visually FIRST tab that is actually enabled
    const firstEnabledTab = fullOrder.find(id => enabled.includes(id as any));
    
    if (firstEnabledTab) {
       setActiveTab(firstEnabledTab as any);
    } else {
      setActiveTab('slides');
    }
    setActiveCategory('全部');
  }, [activeStepId]); // Notice we listen to activeStepId

  const handleAddStep = () => {
    const newStep = {
      id: "step-" + Date.now().toString(),
      title: '新教學步驟',
      slides: [], urls: [], commands: [], prompts: [], flowMarkdown: '',
      enabledTabs: [] as any,
      tabOrder: ['slides', 'urls', 'commands', 'prompts', 'flow'] as any
    };
    onUpdateLesson({
      ...lesson,
      steps: [...normalizedSteps, newStep]
    });
    setActiveStepId(newStep.id);
  };
  
  const handleDeleteStep = (stepId: string) => {
    setDeleteStepConfirm(stepId);
  };

  const executeDeleteStep = () => {
    if (!deleteStepConfirm) return;
    const newSteps = normalizedSteps.filter(s => s.id !== deleteStepConfirm);
    const updatedSteps = newSteps.length ? newSteps : [{
      id: "step-" + Date.now().toString(), title: '單元內容', slides: [], urls: [], commands: [], prompts: []
    } as any];
    
    onUpdateLesson({ ...lesson, steps: updatedSteps });
    
    if (activeStepId === deleteStepConfirm) {
      setActiveStepId(updatedSteps[0].id);
    }
    setDeleteStepConfirm(null);
  };

  const visibleSlides = editMode ? activeData.slides : activeData.slides?.filter(s => s.isVisible !== false) || [];
  const visibleCommands = editMode ? activeData.commands : activeData.commands?.filter(c => c.isVisible !== false) || [];
  const visiblePrompts = editMode ? activeData.prompts : activeData.prompts?.filter(p => p.isVisible !== false) || [];
  const visibleUrls = editMode ? activeData.urls : activeData.urls?.filter(u => u.isVisible !== false) || [];

  useEffect(() => {
    if (activeTab === 'slides' && visibleSlides) {
      const categories = Array.from(new Set(visibleSlides.map(s => s.category).filter(Boolean))) as string[];
      const hasUncategorized = visibleSlides.some(s => !s.category);
      const allCategories = hasUncategorized ? [...categories, '未分類'] : categories;
      
      if (allCategories.length > 0 && !allCategories.includes(activeCategory)) {
        setActiveCategory(allCategories[0]);
      } else if (allCategories.length === 0) {
        setActiveCategory('未分類');
      }
    }
  }, [visibleSlides, activeTab, activeCategory]);

  useEffect(() => {
    if (activeTab === 'prompts' && visiblePrompts) {
      const categories = Array.from(new Set(visiblePrompts.map(p => p.category).filter(Boolean))) as string[];
      const hasUncategorized = visiblePrompts.some(p => !p.category);
      const allCategories = hasUncategorized ? [...categories, '未分類'] : categories;

      if (allCategories.length > 0 && !allCategories.includes(activePromptCategory)) {
        setActivePromptCategory(categories.includes('練習1') ? '練習1' : allCategories[0]);
      } else if (allCategories.length === 0) {
        setActivePromptCategory('未分類');
      }
    }
  }, [visiblePrompts, activeTab, activePromptCategory]);
  const currentDisplaySlides = visibleSlides?.filter(s => s.category === activeCategory || (!s.category && activeCategory === '未分類')) || [];

  const [isExportingWord, setIsExportingWord] = useState(false);

  const ALL_TABS = [
    { id: 'slides', label: '簡報畫面', icon: Presentation },
    { id: 'urls', label: '網址', icon: Link },
    { id: 'commands', label: '指令碼', icon: Terminal },
    { id: 'prompts', label: '提示詞', icon: Lightbulb },
    { id: 'flow', label: '流程圖', icon: Waypoints },
  ] as const;

  type TabType = typeof ALL_TABS[number]['id'];

  const enabledTabs = activeData.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'];
  const rawTabOrder = activeData.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'];
  const missingTabs = ALL_TABS.map(t => t.id).filter(id => !rawTabOrder.includes(id as TabType));
  const tabOrder = [...rawTabOrder, ...(missingTabs as TabType[])];
  
  const displayTabs = tabOrder.map(id => ALL_TABS.find(t => t.id === id)).filter((t): t is typeof ALL_TABS[number] => t !== undefined && t.id !== 'flow');

  useEffect(() => {
    const currentVisibleTabs = editMode ? displayTabs : displayTabs.filter(t => enabledTabs.includes(t.id as TabType));
    if (currentVisibleTabs.length > 0 && !currentVisibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(currentVisibleTabs[0].id as TabType);
    }
  }, [editMode, enabledTabs.join(','), activeTab, displayTabs.map(t=>t.id).join(',')]);

  const isTabVisible = (tabId: TabType) => {
    if (editMode) return true;
    return enabledTabs.includes(tabId);
  };

  const handleMoveTab = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      (direction === 'left' && index === 0) || 
      (direction === 'right' && index === tabOrder.length - 1)
    ) return;

    const newTabOrder = [...tabOrder];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    const temp = newTabOrder[index];
    newTabOrder[index] = newTabOrder[targetIndex];
    newTabOrder[targetIndex] = temp;
    
    updateActiveStep({ tabOrder: newTabOrder });
  };

  const toggleTabEnabled = (tabId: TabType) => {
    const isEnabled = enabledTabs.includes(tabId);
    let newTabs: TabType[];
    
    if (isEnabled) {
      newTabs = enabledTabs.filter(t => t !== tabId) as TabType[];
    } else {
      newTabs = [...enabledTabs, tabId] as TabType[];
    }
    
    updateActiveStep({ enabledTabs: newTabs });
  };

  const allGallerySlides = normalizedSteps.flatMap(s => 
    (s.slides || []).map(slide => ({ ...slide, stepTitle: s.title }))
  ).filter(s => editMode || s.isVisible !== false);
  const currentImageIndex = enlargedImage ? allGallerySlides.findIndex(s => s.imageUrl === enlargedImage) : -1;

  // Escape key to close modal and arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enlargedImage) return;
      if (e.key === 'Escape') {
        setEnlargedImage(null);
      } else if (e.key === 'ArrowLeft') {
        if (currentImageIndex > 0) {
          setEnlargedImage(allGallerySlides[currentImageIndex - 1].imageUrl);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentImageIndex !== -1 && currentImageIndex < allGallerySlides.length - 1) {
          setEnlargedImage(allGallerySlides[currentImageIndex + 1].imageUrl);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedImage, currentImageIndex, allGallerySlides]);

  const handleDownloadImage = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${title || 'slide'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `${title || 'slide'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!lesson) return null;

  const openModal = (type: any, initialData: any, listKey: keyof Lesson) => {
    setModalConfig({ isOpen: true, type, initialData, listKey });
  };

  const handleSave = (data: any) => {
    if (!modalConfig.listKey) return;
    const list = (activeData[modalConfig.listKey as keyof typeof activeData] || []) as any[];
    const exists = list.find((item: any) => item.id === data.id);
    const newList = exists ? list.map((item: any) => item.id === data.id ? data : item) : [...list, data];
    updateActiveStep({ [modalConfig.listKey]: newList });
  };

  const handleDelete = (listKey: keyof Lesson, id: string) => {
    setDeleteConfirm({ listKey, id });
  };

  const handleMove = (listKey: keyof Lesson, id: string, direction: 'up' | 'down') => {
    const list = [...(activeData[listKey as keyof typeof activeData] || [])] as any[];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
    } else {
      return;
    }
    
    updateActiveStep({ [listKey]: list });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { listKey, id } = deleteConfirm;
    const list = (activeData[listKey as keyof typeof activeData] || []) as any[];
    updateActiveStep({ [listKey]: list.filter((item: any) => item.id !== id) });
    setDeleteConfirm(null);
  };

  const generateWordBlob = async () => {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ShadingType } = docx;
      
      const children: any[] = [
        new Paragraph({
          children: [
            new TextRun({ text: lesson.title, bold: true, size: 36 }),
          ],
          spacing: { after: 200 },
        })
      ];

      for (const stepData of normalizedSteps) {
        if (normalizedSteps.length > 1) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: stepData.title, bold: true, size: 32, color: "1d4ed8" }),
              ],
              spacing: { before: 200, after: 150 },
            })
          );
        }

        if (stepData.slides && stepData.slides.length > 0) {
          let currentCategory = '';
          for (const slide of stepData.slides) {
            if (slide.isVisible === false) continue;

            if (slide.category && slide.category !== currentCategory) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: slide.category, bold: true, size: 28 })],
                  spacing: { before: 200, after: 100 },
                })
              );
              currentCategory = slide.category;
            }

            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: slide.title || '未命名簡報', bold: true, size: 24 }),
                ],
                spacing: { before: 200, after: 100 },
                indent: { left: 480 },
              })
            );

            if (slide.imageUrl) {
              try {
                let bufferData: ArrayBuffer;
                let imgType: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg' = 'png';
                
                const lowerUrl = slide.imageUrl.toLowerCase();
                if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || slide.imageUrl.startsWith('data:image/jpeg') || slide.imageUrl.includes('drive.google.com/thumbnail') || slide.imageUrl.includes('drive.google.com/uc')) {
                  imgType = 'jpg';
                } else if (lowerUrl.includes('.gif') || slide.imageUrl.startsWith('data:image/gif')) {
                  imgType = 'gif';
                }

                if (slide.imageUrl.startsWith('data:')) {
                  const response = await fetch(slide.imageUrl);
                  bufferData = await response.arrayBuffer();
                } else {
                  const tryFetch = async (u: string) => {
                     const res = await fetch(u);
                     if (!res.ok) throw new Error(`Status ${res.status}`);
                     const contentType = res.headers.get('content-type');
                     if (contentType && !contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
                       throw new Error(`Invalid content type: ${contentType}`);
                     }
                     const buf = await res.arrayBuffer();
                     // rudimentary check for valid image (magic bytes) or just rely on content-type
                     if (buf.byteLength < 100) throw new Error("File too small to be an image");
                     return buf;
                  };

                  try {
                    // Try fetching directly. This might fail on external domains due to CORS.
                    bufferData = await tryFetch(slide.imageUrl);
                  } catch (e) {
                    // Fallback to images.weserv.nl
                    try {
                      const urlWithoutProto = slide.imageUrl.replace(/^https?:\/\//, '');
                      bufferData = await tryFetch(`https://images.weserv.nl/?url=${encodeURIComponent(urlWithoutProto)}`);
                    } catch (weservError) {
                      // Fallback to CORS proxy
                      try {
                        bufferData = await tryFetch(`https://corsproxy.io/?${encodeURIComponent(slide.imageUrl)}`);
                      } catch (proxyError) {
                        // Fallback to a second proxy
                        bufferData = await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(slide.imageUrl)}`);
                      }
                    }
                  }
                }
                
                children.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: bufferData,
                        type: imgType,
                        transformation: {
                          width: 400,
                          height: 225
                        }
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                  })
                );
              } catch (error) {
                 console.error("Failed to load image for word export:", slide.imageUrl, error);
                 children.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: `[⚠️ 無法載入圖片: ${slide.imageUrl}]`, color: "FF0000" }),
                    ],
                    spacing: { after: 400 },
                  })
                );
              }
            }
            
            if (slide.code) {
              const allCodes = [
                { title: slide.codeTitle || slide.language || '程式碼', code: slide.code },
                ...(slide.extraCodes || []).map((ext: any, i: number) => ({
                  title: ext.title || ext.language || `程式碼 ${i + 2}`,
                  code: ext.code
                }))
              ];

              for (const cd of allCodes) {
                children.push(
                  new Table({
                    width: { size: 90, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                      left: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                      right: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            shading: { fill: "F3F4F6", type: ShadingType.CLEAR, color: "auto" },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [new TextRun({ text: cd.title, color: "374151", bold: true })],
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableRow({
                        children: [
                          new TableCell({
                            shading: { fill: "1F2937", type: ShadingType.CLEAR, color: "auto" },
                            margins: { top: 200, bottom: 200, left: 200, right: 200 },
                            children: cd.code.split('\n').map((line: string) => 
                              new Paragraph({
                                children: [new TextRun({ text: line, font: "Courier New", color: "F9FAFB" })],
                              })
                            ),
                          }),
                        ],
                      }),
                    ],
                  }),
                  new Paragraph({ text: "", spacing: { after: 200 } })
                );
              }
            }
          }
        }

        if (stepData.urls && stepData.urls.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "網址", bold: true, size: 28, color: "059669" })],
              spacing: { before: 200, after: 100 }
            })
          );
          
          const urlRows = stepData.urls
            .filter((item: any) => !(item.isVisible === false))
            .map((item: any) => 
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: item.title, bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: item.url, color: "2563EB", underline: {} })] })],
                  }),
                ],
              })
            );

          if (urlRows.length > 0) {
            children.push(
              new Table({
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                },
                rows: urlRows,
              }),
              new Paragraph({ text: "", spacing: { after: 200 } })
            );
          }
        }

        if (stepData.commands && stepData.commands.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "指令碼", bold: true, size: 28, color: "D97706" })],
              spacing: { before: 200, after: 100 }
            })
          );
          
          for (const item of stepData.commands) {
            if (item.isVisible === false) continue;
            children.push(
              new Table({
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 6, color: "FDE68A" },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "FDE68A" },
                  left: { style: BorderStyle.SINGLE, size: 6, color: "FDE68A" },
                  right: { style: BorderStyle.SINGLE, size: 6, color: "FDE68A" },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "FEF3C7", type: ShadingType.CLEAR, color: "auto" },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun({ text: item.title, size: 24, color: "92400E" })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "1F2937", type: ShadingType.CLEAR, color: "auto" },
                        margins: { top: 150, bottom: 150, left: 150, right: 150 },
                        children: item.code.split('\n').map((line: string) =>
                          new Paragraph({ children: [new TextRun({ text: line, font: "Courier New", color: "F9FAFB" })] })
                        ),
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ text: "", spacing: { after: 200 } })
            );
          }
        }

        if (stepData.prompts && stepData.prompts.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "提示詞", bold: true, size: 28, color: "7C3AED" })],
              spacing: { before: 200, after: 100 }
            })
          );
          
          for (const item of stepData.prompts) {
            if (item.isVisible === false) continue;
            children.push(
              new Table({
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 6, color: "DDD6FE" },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDD6FE" },
                  left: { style: BorderStyle.SINGLE, size: 6, color: "DDD6FE" },
                  right: { style: BorderStyle.SINGLE, size: 6, color: "DDD6FE" },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "EDE9FE", type: ShadingType.CLEAR, color: "auto" },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun({ text: item.title, size: 24, color: "5B21B6" })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "F8FAF0", type: ShadingType.CLEAR, color: "auto" },
                        margins: { top: 150, bottom: 150, left: 150, right: 150 },
                        children: item.content.split('\n').map((line: string) =>
                          new Paragraph({ children: [new TextRun({ text: line, color: "1F2937" })] })
                        ),
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ text: "", spacing: { after: 200 } })
            );
          }
        }
      }

      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: "Normal",
              name: "Normal",
              basedOn: "Normal",
              next: "Normal",
              run: {
                font: "微軟正黑體",
              },
              paragraph: {
                spacing: { line: 360, lineRule: "auto" },
              },
            },
          ],
          default: {
            document: {
              run: {
                font: {
                  ascii: "Calibri",
                  cs: "Calibri",
                  eastAsia: "微軟正黑體",
                  hAnsi: "Calibri",
                },
              },
            },
          },
        },
        sections: [{
          properties: {},
          children: children,
        }],
      });

      return await Packer.toBlob(doc);
  };

  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      const blob = await generateWordBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = courseTitle ? `${courseTitle} - ${lesson.title}` : lesson.title;
      a.download = `${fileName}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Word:", error);
      alert("匯出 Word 失敗，請重試！");
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleExportExcel = (type: 'commands' | 'prompts' | 'slides' | 'urls') => {
    if (type === 'commands') {
      const headers = ['標題 (Title)', '指令代碼 (Code)', '語言 (Language)'];
      const rows = activeData.commands.map(cmd => [
        cmd.title, 
        cmd.code, 
        cmd.language || ''
      ]);
      downloadExcel('commands', headers, rows);
    } else if (type === 'prompts') {
      const headers = ['標題 (Title)', '分類 (Category)', '提示詞內容 (Content)'];
      const rows = activeData.prompts.map(prompt => [
        prompt.title, 
        prompt.category || '',
        prompt.content
      ]);
      downloadExcel('prompts', headers, rows);
    } else if (type === 'slides') {
      const headers = ['簡報標題 (Title)', '圖片網址 (Image URL)', '分類 (Category)', '代碼抬頭 (Code Title)', '指令代碼 (Code)', '語言 (Language)'];
      const rows = activeData.slides.map(slide => [
        slide.title, 
        slide.imageUrl,
        slide.category || '',
        slide.codeTitle || '',
        slide.code || '',
        slide.language || ''
      ]);
      downloadExcel('slides', headers, rows);
    } else if (type === 'urls') {
      const headers = ['網址標題 (Title)', '網址連結 (URL)'];
      const rows = (activeData.urls || []).map(urlItem => [
        urlItem.title, 
        urlItem.url
      ]);
      downloadExcel('urls', headers, rows);
    }
  };

  const downloadExcel = (filename: string, headers: string[], rows: string[][]) => {
    const MAX_CELL_LENGTH = 32767;
    const safeRows = rows.map(row => 
      row.map(cell => {
        if (cell && typeof cell === 'string' && cell.length > MAX_CELL_LENGTH) {
          return cell.substring(0, MAX_CELL_LENGTH - 3) + '...';
        }
        return cell;
      })
    );
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...safeRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${lesson.title}_${filename}.xlsx`);
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const BOM = '\uFEFF';
    const csvContent = 
      BOM +
      headers.join(',') + '\r\n' +
      rows.map(e => e.map(field => `"${field}"`).join(',')).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${lesson.title}_${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = (type: 'commands' | 'prompts' | 'slides' | 'urls') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    
    if (type === 'commands') {
      headers = ['標題 (Title)', '指令代碼 (Code)', '語言 (Language)'];
      rows = [
        ['安裝套件', 'npm install react', 'bash'],
        ['啟動專案', 'npm run dev', 'bash']
      ];
    } else if (type === 'prompts') {
      headers = ['標題 (Title)', '分類 (Category)', '提示詞內容 (Content)'];
      rows = [
        ['角色扮演', '練習1', '請你扮演一位資深前端工程師，幫我解答以下問題...'],
        ['程式碼審核', 'PIP第三方庫', '請幫我審核這段程式碼，指出潛在的問題與優化空間。'],
        ['解答', '答案', '這是練習題的參考解答...']
      ];
    } else if (type === 'slides') {
      headers = ['簡報標題 (Title)', '圖片網址 (Image URL)', '分類 (Category)', '代碼抬頭 (Code Title)', '指令代碼 (Code)', '語言 (Language)'];
      rows = [
        ['封面簡報', 'https://example.com/slide1.png', '第一章', '', '', ''],
        ['大綱介紹', 'https://example.com/slide2.png', '第一章', '安裝指令', 'npm install', 'bash']
      ];
    } else if (type === 'urls') {
      headers = ['網址標題 (Title)', '網址連結 (URL)'];
      rows = [
        ['專案預覽網址', 'https://example.com'],
        ['官方文件', 'https://react.dev']
      ];
    }
    
    downloadCSV(`${type}_template`, headers, rows);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, type: 'commands' | 'prompts' | 'slides' | 'urls') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length <= 1) return; // Skip if only headers or empty

      const newItems: any[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue; // Basic validation
        
        const timestamp = Date.now().toString() + i;
        if (type === 'commands') {
          newItems.push({
            id: timestamp,
            title: row[0] || '',
            code: row[1] || '',
            language: row[2] || '',
          });
        } else if (type === 'prompts') {
          newItems.push({
            id: timestamp,
            title: row[0] || '',
            category: row[1] || '',
            content: row[2] || '',
          });
        } else if (type === 'slides') {
          newItems.push({
            id: timestamp,
            title: row[0] || '',
            imageUrl: row[1] || '',
            category: row[2] || '',
            codeTitle: row[3] || '',
            code: row[4] || '',
            language: row[5] || '',
          });
        } else if (type === 'urls') {
          newItems.push({
            id: timestamp,
            title: row[0] || '',
            url: row[1] || '',
          });
        }
      }
      
      // Append to list
      const currentList = (activeData[type as keyof typeof activeData] || []) as any[];
      updateActiveStep({ [type]: [...currentList, ...newItems] });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const parseCSV = (str: string) => {
    const arr: string[][] = [];
    let quote = false;
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c+1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
      if (cc === '"') { quote = !quote; continue; }
      if (cc === ',' && !quote) { ++col; continue; }
      if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc === '\r' && !quote) { ++row; col = 0; continue; }
      arr[row][col] += cc;
    }
    return arr;
  };

  const toggleVisibility = (listKey: keyof Lesson, item: any) => {
    const list = (activeData[listKey as keyof typeof activeData] || []) as any[];
    const newList = list.map((i: any) => i.id === item.id ? { ...i, isVisible: i.isVisible === false ? true : false } : i);
    updateActiveStep({ [listKey]: newList });
  };

  // Visible data calculation is maintained at the top now

  return (
    <motion.div
      key={lesson.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto w-full pb-20 relative"
    >
      <div className="display-num overflow-hidden">
        {lesson.id.replace('l', '0')}
      </div>
      <header className="relative z-10 mb-8 flex flex-col items-start group">
        {lesson.date && (
          <span className="mono-label mb-2 inline-block bg-[var(--c-accent)] text-white px-3 py-1 rounded-full text-[11px] uppercase border-2 border-[var(--c-accent-hover)] shadow-[0_2px_0_0_var(--c-accent-hover)]">
            {lesson.date}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-4 mb-2 mt-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--c-text)]">{lesson.title}</h1>
          <button 
            onClick={handleExportWord} 
            disabled={isExportingWord}
            className={`shrink-0 text-sm font-bold flex items-center gap-2 text-[var(--c-text)] bg-white hover:bg-slate-50 transition-all px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-[0_2px_0_0_var(--c-border)] ${isExportingWord ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Download size={18} strokeWidth={2.5} /> {isExportingWord ? '匯出中...' : '匯出目前的單元'}
          </button>
        </div>
        {lesson.description && (
          <p className="text-base font-medium text-[var(--c-text-muted)] mt-2 max-w-2xl">{lesson.description}</p>
        )}
      </header>
      {/* --- STEP TABS (Top Navigation) --- */}
      <div className="flex flex-wrap items-end gap-2 mb-8 border-b-2 border-[var(--c-border)] relative z-10 w-full overflow-x-auto pt-2">
        {normalizedSteps.map((step) => (
          <div key={step.id} className="relative group flex items-center">
            <button
              onClick={() => setActiveStepId(step.id)}
              className={`px-5 py-3 rounded-t-xl text-base font-bold transition-all border-2 border-b-0 ${activeStepId === step.id ? 'bg-white border-[var(--c-border)] text-[var(--c-accent)] shadow-[0_-4px_0_0_var(--c-accent)] translate-y-[2px] z-10' : 'bg-slate-50 border-transparent text-[var(--c-text-muted)] hover:bg-slate-200 hover:text-slate-700'}`}
            >
              {editMode && activeStepId === step.id ? (
                <input
                  type="text"
                  value={step.title}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateActiveStep({ title: e.target.value })}
                  className="bg-transparent border-none outline-none font-bold text-[var(--c-accent)] w-32 focus:border-b focus:border-[var(--c-accent)]"
                />
              ) : (
                <span>{step.title}</span>
              )}
            </button>
            {editMode && activeStepId === step.id && normalizedSteps.length > 1 && (
              <button 
                onClick={() => handleDeleteStep(step.id)}
                className="absolute right-1 top-1 text-slate-400 hover:text-red-500 z-20 p-1 bg-white rounded-full shadow-sm"
                title="刪除步驟"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            )}
          </div>
        ))}
        {editMode && (
          <button
            onClick={handleAddStep}
            className="px-4 py-2.5 mb-1 rounded-xl bg-slate-100 text-[var(--c-text-muted)] hover:bg-[var(--c-accent)] hover:text-white transition-all shadow-sm flex items-center gap-1 font-bold text-sm ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            新增步驟
          </button>
        )}
      </div>




      {/* Chunky Tab Navigation */}
      <div className="flex flex-wrap gap-2 lg:gap-3 mb-6 relative z-10 w-full max-w-5xl">
        {displayTabs.map((tab, index) => {
          const isEnabled = enabledTabs.includes(tab.id as TabType);
          if (!editMode && !isEnabled) return null;

          return (
            <div key={tab.id} className="relative flex-1 min-w-[120px] max-w-[200px] group">
              <button
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full py-2.5 px-3 lg:px-4 rounded-xl font-bold text-sm lg:text-[15px] border-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[var(--c-accent)] border-[var(--c-accent-hover)] text-white translate-y-[2px] shadow-none'
                    : isEnabled
                      ? 'bg-white border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:-translate-y-0.5 shadow-[0_2px_0_0_var(--c-border)]'
                      : 'bg-slate-50 border-dashed border-[var(--c-border)] text-slate-400 hover:text-[var(--c-accent)] hover:border-[var(--c-accent)] hover:bg-white border-2 hover:-translate-y-0.5 opacity-70'
                }`}
              >
                <tab.icon size={18} className="shrink-0" /> <span className="truncate">{tab.label}</span>
                {!isEnabled && editMode && <span className="text-xs bg-slate-200 text-slate-500 rounded-md px-2 py-0.5 ml-1 flex items-center gap-1 font-bold"><EyeOff size={12} strokeWidth={3} /> 隱藏中</span>}
              </button>
              
              {editMode && (
                <div className="absolute -top-3 right-0 left-0 mx-auto w-fit opacity-0 group-hover:opacity-100 flex gap-1 z-20 transition-opacity">
                  <button 
                    onClick={(e) => handleMoveTab(index, 'left', e)} 
                    disabled={index === 0} 
                    className="p-1.5 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] bg-white border border-[var(--c-border)] rounded-md shadow-md"
                    title="左移"
                  >
                    <ArrowLeft size={14} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={(e) => handleMoveTab(index, 'right', e)} 
                    disabled={index === displayTabs.length - 1} 
                    className="p-1.5 disabled:opacity-30 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] bg-white border border-[var(--c-border)] rounded-md shadow-md"
                    title="右移"
                  >
                    <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-12 relative z-10">
        
        {/* === SLIDES TAB === */}
        {activeTab === 'slides' && isTabVisible('slides') && (
          <section>
            {editMode && (
              <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[var(--c-border)] pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[var(--c-accent-light)] p-2 rounded-xl border-2 border-[var(--c-border)]">
                     <Presentation size={20} className="text-[var(--c-accent)]" />
                  </div>
                  <h2 className="mono-label !text-lg !text-[var(--c-text)] !mb-0 font-extrabold">簡報畫面</h2>
                  {enabledTabs.includes('slides') ? (
                    <button onClick={() => toggleTabEnabled('slides')} className="ml-4 text-[var(--c-text-muted)] hover:text-slate-700 text-sm font-bold flex items-center gap-1 transition-colors">
                      <EyeOff size={14} strokeWidth={2.5} /> 隱藏此標籤頁
                    </button>
                  ) : (
                    <button onClick={() => toggleTabEnabled('slides')} className="ml-4 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-sm font-bold flex items-center gap-1 transition-colors">
                      <Eye size={14} strokeWidth={2.5} /> 發布顯示此標籤頁
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal('slide', null, 'slides')} className="text-sm font-bold flex items-center gap-1 text-white hover:-translate-y-0.5 transition-transform bg-[var(--c-accent)] px-4 py-2 rounded-xl border-2 border-[var(--c-accent-hover)] shadow-[0_3px_0_0_var(--c-accent-hover)]">
                    <Plus size={16} strokeWidth={3} /> 新增簡報
                  </button>
                </div>
              </div>
            )}
            
            {visibleSlides?.length > 0 ? (
              <>
                {Array.from(new Set(visibleSlides?.map(s => s.category).filter(Boolean))).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 pointer-events-auto relative z-10">
                    {Array.from(new Set(visibleSlides?.map(s => s.category).filter(Boolean))).map(cat => (
                      <button
                        key={cat as string}
                        onClick={() => setActiveCategory(cat as string)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-[var(--c-accent)] text-white shadow-md' : 'bg-slate-100 text-[var(--c-text-muted)] hover:bg-slate-200'}`}
                      >
                        {cat as string} ({visibleSlides.filter(s => s.category === cat).length})
                      </button>
                    ))}
                    {visibleSlides?.some(s => !s.category) && (
                      <button
                        onClick={() => setActiveCategory('未分類')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === '未分類' ? 'bg-[var(--c-accent)] text-white shadow-md' : 'bg-slate-100 text-[var(--c-text-muted)] hover:bg-slate-200'}`}
                      >
                        未分類 ({visibleSlides.filter(s => !s.category).length})
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentDisplaySlides.map((slide, index) => (
                    <div key={slide.id} className="flex flex-col gap-3">
                      <div className={`w-full ppt-frame group shadow-2xl relative overflow-hidden rounded-2xl ${slide.isVisible === false && editMode ? 'opacity-50 grayscale' : ''}`}>
                      <img 
                        src={slide.imageUrl} 
                        alt={slide.title} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Hover Actions (View/Download) */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10 pointer-events-none">
                      <div className="pointer-events-auto flex items-center gap-3">
                        <button onClick={() => setEnlargedImage(slide.imageUrl)} className="p-3 bg-white hover:bg-gray-100 text-[var(--c-text)] rounded-xl transition-transform hover:scale-110 shadow-lg flex items-center gap-2 font-bold text-sm">
                          <Maximize2 size={18} /> 放大
                        </button>
                        <button onClick={() => handleDownloadImage(slide.imageUrl, slide.title)} className="p-3 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-white rounded-xl transition-transform hover:scale-110 shadow-lg flex items-center gap-2 font-bold text-sm">
                          <Download size={18} /> 下載
                        </button>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 justify-between items-center z-10 flex">
                      <div className="bg-white/95 text-[var(--c-text)] px-3 py-1.5 text-xs font-mono rounded-md shadow-sm border border-[var(--c-border)] font-semibold">{slide.title}</div>
                    </div>
                    {editMode && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button disabled={(activeData.slides?.findIndex(s => s.id === slide.id) ?? -1) <= 0} onClick={() => handleMove('slides', slide.id, 'up')} className="p-2 bg-white text-[var(--c-text)] hover:text-[var(--c-accent)] shadow-sm border border-[var(--c-border)] rounded-md disabled:opacity-30 disabled:cursor-not-allowed"><ArrowLeft size={14} /></button>
                        <button disabled={(activeData.slides?.findIndex(s => s.id === slide.id) ?? -1) >= (activeData.slides?.length ?? 0) - 1} onClick={() => handleMove('slides', slide.id, 'down')} className="p-2 bg-white text-[var(--c-text)] hover:text-[var(--c-accent)] shadow-sm border border-[var(--c-border)] rounded-md disabled:opacity-30 disabled:cursor-not-allowed"><ArrowRight size={14} /></button>
                        <button onClick={() => toggleVisibility('slides', slide)} className="p-2 bg-white text-[var(--c-text)] hover:text-[var(--c-accent)] shadow-sm border border-[var(--c-border)] rounded-md" title={slide.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                          {slide.isVisible === false ? <EyeOff size={14} className="text-amber-500" /> : <Eye size={14} className="text-emerald-500" />}
                        </button>
                        <button onClick={() => openModal('slide', slide, 'slides')} className="p-2 bg-white text-[var(--c-text)] hover:text-[var(--c-accent)] shadow-sm border border-[var(--c-border)] rounded-md"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete('slides', slide.id)} className="p-2 bg-white text-[var(--c-text)] hover:text-red-600 shadow-sm border border-[var(--c-border)] rounded-md"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  {slide.code && (
                    <div className={`flex flex-col px-4 py-3 border-2 border-[var(--c-border)] bg-[#F8FAFC] rounded-xl ${slide.isVisible === false && editMode ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">{slide.codeTitle || slide.language || 'Code'}</span>
                        <CopyButton text={slide.code} />
                      </div>
                      <span className="font-mono text-sm text-[var(--c-text)] whitespace-pre-wrap">{renderWithLinks(slide.code)}</span>
                    </div>
                  )}
                  {slide.extraCodes && slide.extraCodes.length > 0 && slide.extraCodes.map((extra, idx) => (
                    <div key={idx} className={`flex flex-col px-4 py-3 border-2 border-[var(--c-border)] bg-[#F8FAFC] rounded-xl ${slide.isVisible === false && editMode ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">{extra.title || extra.language || `Code ${idx + 2}`}</span>
                        <CopyButton text={extra.code} />
                      </div>
                      <span className="font-mono text-sm text-[var(--c-text)] whitespace-pre-wrap">{renderWithLinks(extra.code)}</span>
                    </div>
                  ))}
                  </div>
                ))}
              </div>
              </>
            ) : (
              !editMode ? <p className="text-[var(--c-text-muted)] font-bold italic">目前無簡報畫面。</p> : <p className="text-[var(--c-text)]/30 text-xs italic">無資料，請點擊上方按鈕新增。</p>
            )}
          </section>
        )}

        {/* === URLS TAB === */}
        {activeTab === 'urls' && isTabVisible('urls') && (
          <>
            {(visibleUrls?.length > 0 || editMode) && (
              <section>
                {editMode && (
                  <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[var(--c-border)] pb-3 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-r from-blue-400 to-cyan-400 w-8 h-8 rounded-xl flex items-center justify-center shadow-md">
                        <Link size={18} className="text-white" />
                      </div>
                      <h2 className="mono-label !text-lg !text-[var(--c-text)] !mb-0 font-extrabold">網址</h2>
                      {enabledTabs.includes('urls') ? (
                        <button onClick={() => toggleTabEnabled('urls')} className="ml-4 text-[var(--c-text-muted)] hover:text-slate-700 text-sm font-bold flex items-center gap-1 transition-colors">
                          <EyeOff size={14} strokeWidth={2.5} /> 隱藏此標籤頁
                        </button>
                      ) : (
                        <button onClick={() => toggleTabEnabled('urls')} className="ml-4 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-sm font-bold flex items-center gap-1 transition-colors">
                          <Eye size={14} strokeWidth={2.5} /> 發布顯示此標籤頁
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadTemplate('urls')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                        <Download size={16} strokeWidth={2.5} /> 下載範例
                      </button>
                      <label className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm cursor-pointer">
                        <Upload size={16} strokeWidth={2.5} /> 匯入 CSV
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'urls')} />
                      </label>
                      {activeData.urls?.length > 0 && (
                        <button onClick={() => handleExportExcel('urls')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                          <Download size={16} strokeWidth={2.5} /> 匯出 Excel
                        </button>
                      )}
                      <button onClick={() => openModal('url', null, 'urls')} className="text-sm font-bold flex items-center gap-1 text-white hover:-translate-y-0.5 transition-transform bg-[var(--c-accent)] px-4 py-2 rounded-xl border-2 border-[var(--c-accent-hover)] shadow-[0_3px_0_0_var(--c-accent-hover)]">
                        <Plus size={16} strokeWidth={3} /> 新增網址
                      </button>
                    </div>
                  </div>
                )}

                {visibleUrls?.length > 0 ? (
                  <div className="space-y-4">
                    {visibleUrls.map((urlItem) => (
                      <div key={urlItem.id} className={`glass-panel overflow-hidden relative group ${urlItem.isVisible === false && editMode ? 'opacity-60 grayscale-[0.8]' : ''}`}>
                        <div className="flex items-center justify-between px-6 py-4 border-[var(--c-border)] bg-[#F8FAFC]">
                          <span className="mono-label !text-[var(--c-text)]">
                            <a href={urlItem.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-accent)] underline decoration-2 underline-offset-4 decoration-[var(--c-accent)]/30 hover:decoration-[var(--c-accent)]">
                              {urlItem.title}
                            </a>
                            {urlItem.isVisible === false && <span className="text-amber-500 font-bold ml-2">(已隱藏)</span>}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                               <CopyButton text={urlItem.url} />
                            </div>
                            {editMode && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                <button disabled={(activeData.urls?.findIndex(u => u.id === urlItem.id) ?? -1) <= 0} onClick={() => handleMove('urls', urlItem.id, 'up')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                                <button disabled={(activeData.urls?.findIndex(u => u.id === urlItem.id) ?? -1) >= (activeData.urls?.length ?? 0) - 1} onClick={() => handleMove('urls', urlItem.id, 'down')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                                <button onClick={() => toggleVisibility('urls', urlItem)} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg" title={urlItem.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                                  {urlItem.isVisible === false ? <EyeOff size={16} className="text-amber-500" /> : <Eye size={16} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => openModal('url', urlItem, 'urls')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete('urls', urlItem.id)} className="p-1.5 text-[var(--c-text-muted)] hover:text-red-500 hover:bg-slate-200 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  editMode && <p className="text-[var(--c-text)]/30 text-xs italic">無資料，請點擊上方按鈕新增。</p>
                )}
              </section>
            )}

            {/* Show empty state for urls */}
            {!editMode && !visibleUrls?.length && (
              <p className="text-[var(--c-text-muted)] font-bold italic">目前無網址資料。</p>
            )}
          </>
        )}


        {/* === COMMANDS TAB === */}
        {activeTab === 'commands' && isTabVisible('commands') && (
          <>
            {/* Commands Section */}
            {(visibleCommands?.length > 0 || editMode) && (
              <section>
                {editMode && (
                  <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[var(--c-border)] pb-3 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-sky-100 p-2 rounded-xl border-2 border-[var(--c-border)]">
                        <Terminal size={20} className="text-sky-500" />
                      </div>
                      <h2 className="mono-label !text-lg !text-[var(--c-text)] !mb-0 font-extrabold">指令碼</h2>
                      {enabledTabs.includes('commands') ? (
                        <button onClick={() => toggleTabEnabled('commands')} className="ml-4 text-[var(--c-text-muted)] hover:text-slate-700 text-sm font-bold flex items-center gap-1 transition-colors">
                          <EyeOff size={14} strokeWidth={2.5} /> 隱藏此標籤頁
                        </button>
                      ) : (
                        <button onClick={() => toggleTabEnabled('commands')} className="ml-4 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-sm font-bold flex items-center gap-1 transition-colors">
                          <Eye size={14} strokeWidth={2.5} /> 發布顯示此標籤頁
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadTemplate('commands')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                        <Download size={16} strokeWidth={2.5} /> 下載範例
                      </button>
                      <label className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm cursor-pointer">
                        <Upload size={16} strokeWidth={2.5} /> 匯入 CSV
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'commands')} />
                      </label>
                      {activeData.commands?.length > 0 && (
                        <button onClick={() => handleExportExcel('commands')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                          <Download size={16} strokeWidth={2.5} /> 匯出 Excel
                        </button>
                      )}
                      <button onClick={() => openModal('command', null, 'commands')} className="text-sm font-bold flex items-center gap-1 text-white hover:-translate-y-0.5 transition-transform bg-[var(--c-accent)] px-4 py-2 rounded-xl border-2 border-[var(--c-accent-hover)] shadow-[0_3px_0_0_var(--c-accent-hover)]">
                        <Plus size={16} strokeWidth={3} /> 新增指令
                      </button>
                    </div>
                  </div>
                )}

                {visibleCommands?.length > 0 ? (
                  <div className="space-y-4">
                    {visibleCommands.map((cmd) => (
                      <div key={cmd.id} className={`glass-panel overflow-hidden relative group ${cmd.isVisible === false && editMode ? 'opacity-60 grayscale-[0.8]' : ''}`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--c-border)] bg-[#F8FAFC]">
                          <span className="mono-label !text-[var(--c-text)]">{cmd.title} {cmd.isVisible === false && <span className="text-amber-500 font-bold ml-2">(已隱藏)</span>}</span>
                          <div className="flex items-center gap-3">
                            {editMode && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity mr-4">
                                <button disabled={(activeData.commands?.findIndex(c => c.id === cmd.id) ?? -1) <= 0} onClick={() => handleMove('commands', cmd.id, 'up')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                                <button disabled={(activeData.commands?.findIndex(c => c.id === cmd.id) ?? -1) >= (activeData.commands?.length ?? 0) - 1} onClick={() => handleMove('commands', cmd.id, 'down')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                                <button onClick={() => toggleVisibility('commands', cmd)} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg" title={cmd.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                                  {cmd.isVisible === false ? <EyeOff size={16} className="text-amber-500" /> : <Eye size={16} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => openModal('command', cmd, 'commands')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-200 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete('commands', cmd.id)} className="p-1.5 text-[var(--c-text-muted)] hover:text-red-500 hover:bg-slate-200 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                            )}
                            <CopyButton text={cmd.code} />
                          </div>
                        </div>
                        <div className="p-6 bg-white overflow-x-auto text-[var(--c-text)] rounded-b-2xl">
                          <pre className="font-mono text-[15px] font-medium leading-relaxed text-slate-700">
                            <code>{renderWithLinks(cmd.code)}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   editMode && <p className="text-[var(--c-text)]/30 text-xs italic">無資料，請點擊上方按鈕新增。</p>
                )}
              </section>
            )}

            {/* Show empty state for commands */}
            {!editMode && !visibleCommands?.length && (
              <p className="text-[var(--c-text-muted)] font-bold italic">目前無指令碼資料。</p>
            )}
          </>
        )}

        {/* === PROMPTS TAB === */}
        {activeTab === 'prompts' && isTabVisible('prompts') && (
          <>
            {/* Prompts Section */}
            {(visiblePrompts?.length > 0 || editMode) && (
              <section>
                {editMode && (
                  <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[var(--c-border)] pb-3 pt-4">
                     <div className="flex items-center gap-2">
                      <div className="bg-amber-100 p-2 rounded-xl border-2 border-[var(--c-border)]">
                        <Lightbulb size={20} className="text-amber-500" />
                      </div>
                      <h2 className="mono-label !text-lg !text-[var(--c-text)] !mb-0 font-extrabold">提示詞</h2>
                      {enabledTabs.includes('prompts') ? (
                        <button onClick={() => toggleTabEnabled('prompts')} className="ml-4 text-[var(--c-text-muted)] hover:text-slate-700 text-sm font-bold flex items-center gap-1 transition-colors">
                          <EyeOff size={14} strokeWidth={2.5} /> 隱藏此標籤頁
                        </button>
                      ) : (
                        <button onClick={() => toggleTabEnabled('prompts')} className="ml-4 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-sm font-bold flex items-center gap-1 transition-colors">
                          <Eye size={14} strokeWidth={2.5} /> 發布顯示此標籤頁
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadTemplate('prompts')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                        <Download size={16} strokeWidth={2.5} /> 下載範例
                      </button>
                      <label className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm cursor-pointer">
                        <Upload size={16} strokeWidth={2.5} /> 匯入 CSV
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'prompts')} />
                      </label>
                      {activeData.prompts?.length > 0 && (
                        <button onClick={() => handleExportExcel('prompts')} className="text-sm font-bold flex items-center gap-1 text-[var(--c-text)] hover:bg-slate-100 transition-colors px-4 py-2 rounded-xl border-2 border-[var(--c-border)] shadow-sm">
                          <Download size={16} strokeWidth={2.5} /> 匯出 Excel
                        </button>
                      )}
                      <button onClick={() => openModal('prompt', null, 'prompts')} className="text-sm font-bold flex items-center gap-1 text-white hover:-translate-y-0.5 transition-transform bg-[var(--c-accent)] px-4 py-2 rounded-xl border-2 border-[var(--c-accent-hover)] shadow-[0_3px_0_0_var(--c-accent-hover)]">
                        <Plus size={16} strokeWidth={3} /> 新增提示詞
                      </button>
                    </div>
                  </div>
                )}

                {visiblePrompts?.length > 0 ? (
                  <>
                    {Array.from(new Set(visiblePrompts?.map(p => p.category).filter(Boolean))).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6 pointer-events-auto relative z-10">
                        {Array.from(new Set(visiblePrompts?.map(p => p.category).filter(Boolean))).map(cat => (
                          <button
                            key={cat as string}
                            onClick={() => setActivePromptCategory(cat as string)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activePromptCategory === cat ? 'bg-[var(--c-accent)] text-white shadow-md' : 'bg-slate-100 text-[var(--c-text-muted)] hover:bg-slate-200'}`}
                          >
                            {cat as string} ({visiblePrompts.filter(p => p.category === cat).length})
                          </button>
                        ))}
                        {visiblePrompts?.some(p => !p.category) && (
                          <button
                            onClick={() => setActivePromptCategory('未分類')}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activePromptCategory === '未分類' ? 'bg-[var(--c-accent)] text-white shadow-md' : 'bg-slate-100 text-[var(--c-text-muted)] hover:bg-slate-200'}`}
                          >
                            未分類 ({visiblePrompts.filter(p => !p.category).length})
                          </button>
                        )}
                      </div>
                    )}
                    <div className="space-y-6">
                      {(visiblePrompts?.filter(p => p.category === activePromptCategory || (!p.category && activePromptCategory === '未分類'))).map((prompt) => (
                        <div key={prompt.id} className={`glass-panel p-8 relative group ${prompt.isVisible === false && editMode ? 'opacity-60 grayscale-[0.8]' : ''}`}>
                          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
                            {editMode && (
                              <div className="flex gap-2">
                                <button disabled={(activeData.prompts?.findIndex(p => p.id === prompt.id) ?? -1) <= 0} onClick={() => handleMove('prompts', prompt.id, 'up')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={16} /></button>
                                <button disabled={(activeData.prompts?.findIndex(p => p.id === prompt.id) ?? -1) >= (activeData.prompts?.length ?? 0) - 1} onClick={() => handleMove('prompts', prompt.id, 'down')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={16} /></button>
                                <button onClick={() => toggleVisibility('prompts', prompt)} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-50 rounded" title={prompt.isVisible === false ? '目前隱藏 (點擊發布)' : '目前發布 (點擊隱藏)'}>
                                  {prompt.isVisible === false ? <EyeOff size={16} className="text-amber-500" /> : <Eye size={16} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => openModal('prompt', prompt, 'prompts')} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-slate-50 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete('prompts', prompt.id)} className="p-1.5 text-[var(--c-text-muted)] hover:text-red-500 hover:bg-slate-50 rounded"><Trash2 size={16} /></button>
                              </div>
                            )}
                            <CopyButton text={prompt.content} />
                          </div>
                          <div className="prompt-box mb-4 mt-2">
                            <p className="text-sm text-[var(--c-text-muted)] font-mono font-bold mb-3 bg-[var(--c-bg)] inline-block px-3 py-1 rounded-lg border-2 border-[var(--c-border)]">
                              💡 {prompt.title} {prompt.isVisible === false && <span className="text-amber-500 ml-1">(已隱藏)</span>}
                            </p>
                            <p className="text-lg font-medium text-[var(--c-text)] leading-relaxed whitespace-pre-wrap pr-10">
                              {renderWithLinks(prompt.content)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                   editMode && <p className="text-[var(--c-text)]/30 text-xs italic">無資料，請點擊上方按鈕新增。</p>
                )}
              </section>
            )}
            
            {/* Show empty state for prompts */}
            {!editMode && !visiblePrompts?.length && (
              <p className="text-[var(--c-text-muted)] font-bold italic">目前無提示詞資料。</p>
            )}
          </>
        )}
      </div>
      

      <EditorModal 
        type={modalConfig.type} 
        isOpen={modalConfig.isOpen} 
        initialData={modalConfig.initialData} 
        onClose={() => setModalConfig({ isOpen: false, type: null })} 
        onSave={handleSave} 
      />

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="確認刪除"
      >
        <div className="space-y-4 pt-2">
          <p className="text-[var(--c-text)] font-medium">
            確定要刪除這筆資料嗎？此操作無法復原。
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border-2 border-[var(--c-border)] rounded-lg text-sm font-bold text-[var(--c-text-muted)] hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={executeDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 border-2 border-red-600 rounded-lg text-sm font-bold text-white transition-colors"
            >
              確定刪除
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteStepConfirm !== null}
        onClose={() => setDeleteStepConfirm(null)}
        title="確認刪除教學步驟"
      >
        <div className="space-y-4 pt-2">
          <p className="text-[var(--c-text)] font-medium">
            確定要刪除此教學步驟與所有內部資料嗎？此操作無法復原。
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setDeleteStepConfirm(null)}
              className="px-4 py-2 border-2 border-[var(--c-border)] rounded-lg text-sm font-bold text-[var(--c-text-muted)] hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={executeDeleteStep}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 border-2 border-red-600 rounded-lg text-sm font-bold text-white transition-colors"
            >
              確定刪除
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Fullscreen Modal */}
      {enlargedImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 md:p-8 backdrop-blur-md" 
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); handleDownloadImage(enlargedImage, 'download'); }} 
              className="absolute top-4 left-4 md:top-8 md:left-8 p-3 px-5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-white rounded-full transition-all z-[101] flex items-center gap-2 font-bold shadow-xl"
            >
              <Download size={20} />
              <span className="hidden sm:inline">下載圖片</span>
            </button>
            <button 
              onClick={() => setEnlargedImage(null)} 
              className="absolute top-4 right-4 md:top-8 md:right-8 p-3 px-5 sm:px-6 bg-white hover:bg-gray-100 text-gray-900 rounded-full transition-all z-[101] flex items-center gap-2 font-bold shadow-2xl group border-2 border-transparent hover:scale-105"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform text-red-500 stroke-[3]" />
              <span className="hidden sm:inline">關閉 (Esc)</span>
            </button>

            {currentImageIndex > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setEnlargedImage(allGallerySlides[currentImageIndex - 1].imageUrl); }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[101] backdrop-blur-md border border-white/20 hover:scale-110 shadow-2xl group"
                title="上一張 (Arrow Left)"
              >
                <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
              </button>
            )}

            {currentImageIndex !== -1 && currentImageIndex < allGallerySlides.length - 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setEnlargedImage(allGallerySlides[currentImageIndex + 1].imageUrl); }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[101] backdrop-blur-md border border-white/20 hover:scale-110 shadow-2xl group"
                title="下一張 (Arrow Right)"
              >
                <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <img 
              src={enlargedImage} 
              className="max-w-[90vw] max-h-[85vh] object-contain drop-shadow-2xl rounded-lg pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
            {currentImageIndex !== -1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-[101]">
                <div className="px-6 py-2 bg-black/70 backdrop-blur-md rounded-full text-white text-lg font-bold shadow-xl border border-white/10 text-center max-w-2xl truncate">
                  {allGallerySlides[currentImageIndex]?.stepTitle || '單元'} 
                  {allGallerySlides[currentImageIndex]?.title ? ` - ${allGallerySlides[currentImageIndex].title}` : ''}
                </div>
                <div className="px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-sm font-medium">
                  {currentImageIndex + 1} / {allGallerySlides.length}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
