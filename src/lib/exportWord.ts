import { Course, Lesson, LessonStep, Slide } from '../types';

export const exportAllToWord = async (courses: Course[], editMode: boolean, fileName: string = 'teaching-toolkit-export.docx') => {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ShadingType } = docx;

  const children: any[] = [];

  for (const course of courses) {
    if (course.isVisible === false) continue;

    children.push(
      new Paragraph({
        children: [new TextRun({ text: course.title, bold: true, size: 48, color: "1e40af" })],
        spacing: { before: 400, after: 200 },
      })
    );

    for (const lesson of course.lessons) {
      if (lesson.isVisible === false) continue;

      children.push(
        new Paragraph({
          children: [new TextRun({ text: lesson.title, bold: true, size: 36 })],
          spacing: { before: 300, after: 200 },
        })
      );

      const normalizedSteps = lesson.steps && lesson.steps.length > 0 
        ? lesson.steps 
        : [{
            id: 'legacy',
            title: '教學單元內容',
            slides: lesson.slides || [],
            urls: lesson.urls || [],
            commands: lesson.commands || [],
            prompts: lesson.prompts || []
          }];

      for (const stepData of normalizedSteps) {
        if (normalizedSteps.length > 1) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: stepData.title, bold: true, size: 32, color: "1d4ed8" })],
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
                children: [new TextRun({ text: slide.title || '未命名簡報', bold: true, size: 24 })],
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
                     if (buf.byteLength < 100) throw new Error("File too small to be an image");
                     return buf;
                  };

                  try {
                    bufferData = await tryFetch(slide.imageUrl);
                  } catch (e) {
                    try {
                      const urlWithoutProto = slide.imageUrl.replace(/^https?:\/\//, '');
                      bufferData = await tryFetch(`https://images.weserv.nl/?url=${encodeURIComponent(urlWithoutProto)}`);
                    } catch (weservError) {
                      try {
                        bufferData = await tryFetch(`https://corsproxy.io/?${encodeURIComponent(slide.imageUrl)}`);
                      } catch (proxyError) {
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
                        transformation: { width: 400, height: 225 }
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
                    children: [new TextRun({ text: `[⚠️ 無法載入圖片: ${slide.imageUrl}]`, color: "FF0000" })],
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
            .filter(item => !(item.isVisible === false))
            .map(item => 
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
                        children: item.code.split('\n').map(line =>
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
                        children: item.content.split('\n').map(line =>
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
            spacing: { line: 360, lineRule: "auto" }, // Adds standard line spacing
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
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};
