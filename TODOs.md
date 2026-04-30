# GitHub Pages 部署任務清單

## 1. 專案配置 (Research & Strategy)
- [ ] 確認 GitHub 倉庫名稱 (暫定為 `hadyyuno-lesson`) <!-- @task: 1.1 -->
- [ ] 修改 `vite.config.ts` 加入 `base` 設定 <!-- @task: 1.2 -->
- [ ] 建立 `.github/workflows/deploy.yml` 部署腳本 <!-- @task: 1.3 -->

## 2. Git 倉庫初始化 (Execution)
- [ ] 執行 `git init` 初始化本地倉庫 <!-- @task: 2.1 -->
- [ ] 建立並確認 `.gitignore` 排除敏感檔案 <!-- @task: 2.2 -->
- [ ] 執行 `gh repo create` 建立遠端倉庫並連結 <!-- @task: 2.3 -->

## 3. 首次推送與驗證 (Validation)
- [ ] 提交所有檔案至本地倉庫 (`git add`, `git commit`) <!-- @task: 3.1 -->
- [ ] 推送至 GitHub 遠端倉庫 <!-- @task: 3.2 -->
- [ ] 監控 GitHub Actions 執行狀態至成功 <!-- @task: 3.3 -->
- [ ] 驗證 GitHub Pages 網址是否可正常訪問 <!-- @task: 3.4 -->

## 4. 安全性與後續優化
- [ ] 調整 API Key 讀取邏輯以避免外洩 <!-- @task: 4.1 -->
- [ ] 提供「一鍵推送」指令摘要給使用者 <!-- @task: 4.2 -->
