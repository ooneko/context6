---
title: Git 常用命令
tags: [git, version-control]
---

# Git 常用命令

## 基础命令

### 初始化仓库
```bash
git init
```

### 克隆仓库
```bash
git clone <repository-url>
```

### 查看状态
```bash
git status
```

### 添加文件到暂存区
```bash
git add <file>
git add .
```

### 提交更改
```bash
git commit -m "commit message"
```

## 分支管理

### 创建新分支
```bash
git branch <branch-name>
```

### 切换分支
```bash
git checkout <branch-name>
```

### 创建并切换到新分支
```bash
git checkout -b <branch-name>
```

### 合并分支
```bash
git merge <branch-name>
```

## 远程仓库

### 添加远程仓库
```bash
git remote add origin <repository-url>
```

### 推送到远程仓库
```bash
git push origin <branch-name>
```

### 从远程仓库拉取
```bash
git pull origin <branch-name>
```