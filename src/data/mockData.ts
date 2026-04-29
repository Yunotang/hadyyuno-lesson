import { Course } from '../types';

export const mockCourses: Course[] = [
  {
    id: 'c1',
    title: 'AI 提示詞工程基礎',
    description: '學習撰寫有效提示詞的核心基礎。',
    date: '2026-04-22',
    practiceMaterialUrl: 'https://example.com',
    lessons: [
      {
        id: 'l1',
        title: '單元 1：認識大型語言模型 (LLMs)',
        description: '了解大型語言模型的運作原理與結構。',
        date: '2026-04-22',
        slides: [
          {
            id: 's1',
            title: '什麼是 LLM？',
            imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800&h=450',
          },
          {
            id: 's2',
            title: 'Transformer 架構概論',
            imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&h=450',
          }
        ],
        commands: [
          {
            id: 'cmd1',
            title: '安裝 OpenAI Python SDK',
            code: 'pip install openai',
            language: 'bash',
          },
          {
            id: 'cmd2',
            title: '基礎 API 呼叫範例',
            code: 'import openai\n\nresponse = openai.ChatCompletion.create(\n  model="gpt-3.5-turbo",\n  messages=[{"role": "user", "content": "你好！"}]\n)',
            language: 'python',
          }
        ],
        prompts: [
          {
            id: 'p1',
            title: '基礎角色扮演',
            content: '請扮演一位資深的軟體工程師。使用譬喻的方式，對一個聰明的5歲小孩解釋什麼是 REST API。'
          },
          {
            id: 'p2',
            title: '結構化輸出',
            content: '分析以下文本，並將關鍵資訊提取為 JSON 格式，包含這些欄位："summary"（摘要）、"sentiment"（情緒）、"keywords"（關鍵字）。'
          }
        ]
      },
      {
        id: 'l2',
        title: '單元 2：進階模型對話技巧',
        description: '少樣本學習 (Few-shot prompting)、思維鏈 (Chain of Thought) 等進階手法。',
        date: '2026-04-29',
        slides: [
          {
            id: 's3',
            title: '少樣本學習 (Few-Shot)',
            imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800&h=450',
          }
        ],
        commands: [],
        prompts: [
          {
            id: 'p3',
            title: '思維鏈基礎',
            content: "讓我們一步步來思考並解決這個邏輯謎題..."
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'React 與 Tailwind 實戰工作坊',
    description: '現代化前端開發實務。',
    date: '2026-05-10',
    lessons: [
      {
        id: 'l3',
        title: '環境建置與初始化',
        date: '2026-05-10',
        slides: [],
        commands: [
          {
            id: 'cmd3',
            title: '建立 Vite 專案',
            code: 'npm create vite@latest my-app -- --template react-ts',
            language: 'bash'
          },
          {
            id: 'cmd4',
            title: '安裝 Tailwind CSS',
            code: 'npm install -D tailwindcss@4 @tailwindcss/vite',
            language: 'bash'
          }
        ],
        prompts: [
          {
            id: 'p4',
            title: '生成 React 元件',
            content: '請建立一個名為 UserProfile 的 React 函數型元件，接收 name、avatar_url 以及 bio 作為 props。使用 Tailwind CSS 打造現代化的卡片排版。'
          }
        ]
      }
    ]
  }
];
