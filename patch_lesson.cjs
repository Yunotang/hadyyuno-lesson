const fs = require('fs');
let code = fs.readFileSync('src/components/LessonView.tsx', 'utf8');

const regexVars = /(lesson\.)(slides|urls|commands|prompts|flowMarkdown|flowTitle|enabledTabs|tabOrder)/g;
code = code.replace(regexVars, 'activeData.$2');

const regexVarsOpt = /(lesson\?\.)(slides|urls|commands|prompts|flowMarkdown|flowTitle|enabledTabs|tabOrder)/g;
code = code.replace(regexVarsOpt, 'activeData?.$2');

// Restore lesson references inside normalizedSteps initialization
code = code.replace(/title: activeData\.flowTitle \|\| '單元內容'/g, "title: lesson.flowTitle || '單元內容'");
code = code.replace(/slides: activeData\.slides \|\| \[\]/g, "slides: lesson.slides || []");
code = code.replace(/urls: activeData\.urls \|\| \[\]/g, "urls: lesson.urls || []");
code = code.replace(/commands: activeData\.commands \|\| \[\]/g, "commands: lesson.commands || []");
code = code.replace(/prompts: activeData\.prompts \|\| \[\]/g, "prompts: lesson.prompts || []");
code = code.replace(/flowMarkdown: activeData\.flowMarkdown \|\| ''/g, "flowMarkdown: lesson.flowMarkdown || ''");
code = code.replace(/enabledTabs: activeData\.enabledTabs/g, "enabledTabs: lesson.enabledTabs");
code = code.replace(/tabOrder: activeData\.tabOrder/g, "tabOrder: lesson.tabOrder");
code = code.replace(/flowTitle: activeData\.flowTitle/g, "flowTitle: lesson.flowTitle");

fs.writeFileSync('src/components/LessonView.tsx', code);
