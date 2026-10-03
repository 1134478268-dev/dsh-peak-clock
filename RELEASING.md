# Releasing / 发布指南

[English](#english) · [中文](#中文)

## English

1. Create an **empty** repository on GitHub (do *not* add a README/license), e.g. `dsh-peak-clock`.
2. Replace the placeholder `REPLACE_WITH_GITHUB_USER` with your GitHub user/org in
   `package.json`, `README.md`, `LICENSE` and `.github/workflows/publish.yml`:
   ```powershell
   Get-ChildItem -Recurse -File | Where-Object { $_.Name -ne 'RELEASING.md' } |
     ForEach-Object { $p = $_.FullName; (Get-Content $p -Raw).Replace('REPLACE_WITH_GITHUB_USER','<you>') |
     Set-Content $p -NoNewline -Encoding UTF8 }
   ```
3. Push:
   ```sh
   git remote add origin https://github.com/<you>/dsh-peak-clock.git
   git branch -M main
   git push -u origin main --tags
   ```
   When asked for a password, paste a **Personal Access Token** (not your account password).
4. Create a GitHub **Release** for tag `v1.0.0` and attach `dsh-peak-clock-1.0.0.tgz`.
5. Optional — publish to npm: add a repository secret `NPM_TOKEN`; pushing a `v*` tag then runs the
   bundled workflow (`npm test` → `npm publish --access public`).

## 中文

1. 在 GitHub 建一个**空仓库**（不要勾 README/License），例如 `dsh-peak-clock`
2. 把占位符 `REPLACE_WITH_GITHUB_USER` 换成你的用户名/组织，涉及 `package.json`、`README.md`、`LICENSE`、`.github/workflows/publish.yml`（命令见上方 English 第 2 步）
3. 推送：
   ```powershell
   git remote add origin https://github.com/<你的用户名>/dsh-peak-clock.git
   git branch -M main
   git push -u origin main --tags
   ```
   提示输入密码时粘贴 **Personal Access Token**（不是账号密码）
4. 在 GitHub 为 tag `v1.0.0` 建 **Release**，把 `dsh-peak-clock-1.0.0.tgz` 作为附件上传
5. 可选：发布到 npm —— 在仓库 Secrets 添加 `NPM_TOKEN`，之后推 `v*` tag 会自动跑测试并 `npm publish`

> 本机便携版 git：`D:\dsh-plugins-src\.tools\MinGit\cmd\git.exe`（未加入系统 PATH，不污染环境）