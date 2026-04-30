const fs = require('fs');

let content = fs.readFileSync('src/components/LessonView.tsx', 'utf8');

// Replace standard lesson accessors
const props = ['slides', 'urls', 'commands', 'prompts', 'flowMarkdown', 'flowTitle', 'enabledTabs', 'tabOrder'];

for (const p of props) {
  content = content.replace(new RegExp(`lesson\\\\.${p}`, 'g'), `activeData.${p}`);
  content = content.replace(new RegExp(`lesson\\\\?\\\\.${p}`, 'g'), `activeData?.${p}`);
}

// Ensure normalizedSteps uses lesson
content = content.replace(
  "title: activeData.flowTitle || '單元內容',",
  "title: lesson.flowTitle || '單元內容',"
);
for (const p of ["slides", "urls", "commands", "prompts", "flowMarkdown", "enabledTabs", "tabOrder"]) {
  content = content.replace(
    new RegExp(`${p}: activeData\\.${p}`, 'g'),
    `${p}: lesson.${p}`
  );
}

// Fix updates
content = content.replace(
  "onUpdateLesson({ ...lesson, tabOrder: newTabOrder });",
  "updateActiveStep({ tabOrder: newTabOrder });"
);
content = content.replace(
  "onUpdateLesson({ ...lesson, enabledTabs: newTabs });",
  "updateActiveStep({ enabledTabs: newTabs });"
);
content = content.replace(
  "const list = (activeData[modalConfig.listKey] || []) as any[];",
  "const list = (activeData[modalConfig.listKey as keyof typeof activeData] || []) as any[];"
);
content = content.replace(
  "onUpdateLesson({ ...lesson, [modalConfig.listKey]: newList });",
  "updateActiveStep({ [modalConfig.listKey]: newList });"
);
content = content.replace(
  "const list = (activeData[listKey] || []) as any[];",
  "const list = (activeData[listKey as keyof typeof activeData] || []) as any[];"
);
content = content.replace(
  "onUpdateLesson({ ...lesson, [listKey]: list.filter((item: any) => item.id !== id) });",
  "updateActiveStep({ [listKey]: list.filter((item: any) => item.id !== id) });"
);
content = content.replace(
  "const currentList = (activeData[type] || []) as any[];",
  "const currentList = (activeData[type as keyof typeof activeData] || []) as any[];"
);
content = content.replace(
  "onUpdateLesson({ ...lesson, [type]: [...currentList, ...newItems] });",
  "updateActiveStep({ [type]: [...currentList, ...newItems] });"
);
content = content.replace(
  "onUpdateLesson({ ...lesson, [listKey]: newList });",
  "updateActiveStep({ [listKey]: newList });"
);
content = content.replace(
  /onChange=\{\(e\) => onUpdateLesson\(\{\.\.\.lesson, flowTitle: e\.target\.value\}\)\}/g,
  "onChange={(e) => updateActiveStep({ flowTitle: e.target.value })}"
);
content = content.replace(
  /onChange=\{\(e\) => onUpdateLesson\(\{\.\.\.lesson, flowMarkdown: e\.target\.value\}\)\}/g,
  "onChange={(e) => updateActiveStep({ flowMarkdown: e.target.value })}"
);

// Top Tabs UI
const tabsUI = `
      {/* --- STEP TABS (Top Navigation) --- */}
      <div className="flex flex-wrap items-end gap-2 mb-8 border-b-2 border-[var(--c-border)] relative z-10 w-full overflow-x-auto pt-2">
        {normalizedSteps.map((step) => (
          <div key={step.id} className="relative group flex items-center">
            <button
              onClick={() => setActiveStepId(step.id)}
              className={\`px-5 py-3 rounded-t-xl text-base font-bold transition-all border-2 border-b-0 \${activeStepId === step.id ? 'bg-white border-[var(--c-border)] text-[var(--c-accent)] shadow-[0_-4px_0_0_var(--c-accent)] translate-y-[2px] z-10' : 'bg-slate-50 border-transparent text-[var(--c-text-muted)] hover:bg-slate-200 hover:text-slate-700'}\`}
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
`;
const headerSplitIndex = content.indexOf("</header>") + "</header>".length;
content = content.slice(0, headerSplitIndex) + tabsUI + content.slice(headerSplitIndex);

fs.writeFileSync('src/components/LessonView.tsx', content);
