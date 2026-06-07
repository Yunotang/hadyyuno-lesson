export interface Command {
  id: string;
  title: string;
  code: string;
  language?: string;
  isVisible?: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  isVisible?: boolean;
}

export interface UrlItem {
  id: string;
  title: string;
  url: string;
  isVisible?: boolean;
}

export interface Slide {
  id: string;
  title: string;
  category?: string;
  imageUrl: string;
  isVisible?: boolean;
  code?: string;
  language?: string;
  codeTitle?: string;
  extraCodes?: { title: string; code: string; language?: string }[];
}

export type TabType = 'slides' | 'urls' | 'commands' | 'prompts' | 'flow';

export interface WorkflowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface LessonStep {
  id: string;
  title: string;
  slides: Slide[];
  urls?: UrlItem[];
  commands: Command[];
  prompts: Prompt[];
  flowNodes?: WorkflowNode[];
  flowEdges?: WorkflowEdge[];
  flowMarkdown?: string;
  enabledTabs?: TabType[];
  tabOrder?: TabType[];
}

export interface LessonLink {
  id: string;
  title: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  links?: LessonLink[];
  date?: string;
  isFeatured?: boolean;
  isVisible?: boolean;
  order?: number;
  practiceMaterialUrl?: string;
  materials?: { id: string; name: string; url: string }[];
  steps?: LessonStep[];
  
  // Legacy properties (will be migrated to steps inside the app)
  enabledTabs?: TabType[];
  tabOrder?: TabType[];
  slides?: Slide[];
  urls?: UrlItem[];
  commands?: Command[];
  prompts?: Prompt[];
  flowNodes?: WorkflowNode[];
  flowEdges?: WorkflowEdge[];
  flowMarkdown?: string;
  flowTitle?: string;
}

export interface SystemSettings {
  globalPracticeMaterialUrl?: string; // legacy single file
  globalPracticeMaterialName?: string;
  globalMaterialsDescription?: string;
  globalMaterials?: { id: string; name: string; url: string; remark?: string }[];
  advancedWorksUrl?: string;
  discussionForumUrl?: string;
  messageBoardUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  date?: string;
  isVisible?: boolean;
  order?: number;
  practiceMaterialUrl?: string;
  materials?: { id: string; name: string; url: string }[];
  lessons: Lesson[];
}
