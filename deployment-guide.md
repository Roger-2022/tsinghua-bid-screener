# BID AI Screener — 部署与项目转移完整指南

> 本文档记录了 Tsinghua BID AI Screener 系统从零到上线的完整流程，以及项目所有权转移的详细步骤。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术架构](#2-技术架构)
3. [Supabase 设置（数据库 + 认证）](#3-supabase-设置数据库--认证)
4. [GitHub 仓库设置](#4-github-仓库设置)
5. [Vercel 部署（网站上线）](#5-vercel-部署网站上线)
6. [上线后验证](#6-上线后验证)
7. [日常维护](#7-日常维护)
8. [项目所有权转移](#8-项目所有权转移)
9. [交接清单模板](#9-交接清单模板)
10. [常见问题](#10-常见问题)

---

## 1. 项目概览

**BID AI Screener** 是清华大学 BID 的 AI 招新筛选系统，用于：

- **候选人**：在手机或电脑上完成面试问卷（基本信息 + AI 面试）
- **管理员**：登录后台查看所有候选人数据、打分、筛选

### 当前项目资源

| 资源 | 地址 |
|------|------|
| 网站（公网） | https://tsinghua-bid-screener.vercel.app |
| GitHub 仓库 | https://github.com/Roger-2022/tsinghua-bid-screener |
| Supabase 项目 | https://supabase.com/dashboard/project/vspohrqwtedhkstupgdm |
| Supabase URL | https://vspohrqwtedhkstupgdm.supabase.co |

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户（手机/电脑）                       │
│                         │                                │
│                         ▼                                │
│            Vercel（前端托管，自动部署）                     │
│            https://tsinghua-bid-screener.vercel.app      │
│                         │                                │
│              ┌──────────┴──────────┐                     │
│              ▼                     ▼                     │
│     Supabase PostgreSQL      Supabase Auth               │
│     （候选人数据存储）         （管理员登录认证）            │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| UI | Tailwind CSS |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth |
| 前端托管 | Vercel |
| 代码托管 | GitHub |
| AI 面试 | Google Gemini API |

### 核心文件

| 文件 | 作用 |
|------|------|
| `src/services/supabaseClient.ts` | Supabase 连接客户端 |
| `src/services/candidateService.ts` | 候选人数据的增删改查（双写：localStorage + Supabase） |
| `src/services/authService.ts` | 管理员认证（Supabase Auth + 本地降级） |
| `src/components/AdminLogin.tsx` | 管理员登录页面 |
| `src/App.tsx` | 主应用逻辑 |
| `.env.local` | 环境变量（Supabase URL、Key 等，不上传 GitHub） |

### 数据流

1. **候选人提交**：数据先写入 localStorage（确保不丢失），再异步写入 Supabase
2. **管理员查看**：优先从 Supabase 拉取数据，Supabase 不可用时降级到 localStorage
3. **认证**：管理员通过 Supabase Auth 登录，Supabase 不可用时降级到硬编码密码

---

## 3. Supabase 设置（数据库 + 认证）

### 3.1 创建 Supabase 项目

1. 打开 https://supabase.com 并注册/登录（可用 GitHub 账号登录）
2. 点击 **"New Project"**
3. 填写：
   - **Name**：`tsinghua-bid-screener`
   - **Database Password**：设一个强密码并**记下来**（后续维护可能需要）
   - **Region**：选 **Singapore (Southeast Asia)**（国内访问速度最快的节点）
4. 点 **"Create new project"**，等待 1-2 分钟初始化完成

### 3.2 建表（SQL Editor）

1. 在 Supabase Dashboard 左侧菜单点 **"SQL Editor"**
2. 点 **"New query"**
3. 将以下 SQL **全部**复制粘贴进去：

```sql
-- ============================================
-- BID AI Screener 数据库初始化
-- ============================================

-- 1. 建表：candidates（候选人信息表）
CREATE TABLE candidates (
  id              TEXT PRIMARY KEY,           -- 唯一标识符
  display_name    TEXT NOT NULL,              -- 显示名称
  status          TEXT NOT NULL               -- 状态：pass/hold/reject
    CHECK (status IN ('pass', 'hold', 'reject')),
  status_badge    TEXT,                       -- 状态标签
  name            TEXT NOT NULL,              -- 姓名
  email           TEXT,                       -- 邮箱
  phone           TEXT,                       -- 电话
  wechat_id       TEXT,                       -- 微信号
  identity        TEXT,                       -- 身份
  school_org      TEXT,                       -- 学校/组织
  score_overall   REAL,                       -- 综合评分
  data            JSONB NOT NULL,             -- 完整候选人记录（JSON 格式）
  created_at      TIMESTAMPTZ DEFAULT now(),  -- 创建时间
  updated_at      TIMESTAMPTZ DEFAULT now()   -- 更新时间
);

-- 2. 索引（加速查询）
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);

-- 3. 自动更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. 开启行级安全策略（Row Level Security）
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- 5. 安全策略
--    匿名用户（候选人）：只能插入数据
--    认证用户（管理员）：可以读取、修改、删除数据
CREATE POLICY "anon_insert"  ON candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_select"  ON candidates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_update"  ON candidates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete"  ON candidates FOR DELETE USING (auth.role() = 'authenticated');
```

4. 点 **"Run"**（或 Ctrl+Enter / Cmd+Enter）
5. 看到绿色 **"Success. No rows returned"** 即为成功

### 3.3 创建管理员账户

1. 左侧菜单点 **"Authentication"**（锁形图标）
2. 点上方 **"Users"** 标签
3. 点 **"Add user"** → **"Create new user"**
4. 填写：
   - **Email**：你要用的管理邮箱（如 `admin@mails.tsinghua.edu.cn`）
   - **Password**：你要设的管理密码
   - 勾选 **"Auto Confirm User"**（跳过邮箱验证）
5. 点 **"Create user"**

> **注意**：如果希望保留邮箱验证功能（Confirm email 开关开启），则管理员创建时必须勾选 Auto Confirm，否则无法登录。

### 3.4 获取 API Key（非常重要）

1. 左侧菜单最下方点 **"Project Settings"**（齿轮图标）
2. 点左侧 **"API"**
3. 记下两个值：
   - **Project URL**：类似 `https://xxxxxxxx.supabase.co`
   - **anon public key**：一串以 `eyJhbGciOi...` 或 `sb_publishable_...` 开头的字符串

这两个值后面在 Vercel 部署时需要作为环境变量填入。

### 3.5 本地开发环境配置

在项目根目录创建或编辑 `.env.local` 文件：

```bash
GEMINI_API_KEY=你的GeminiAPIKey
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=你复制的anon_key
```

> `.env.local` 已被 `.gitignore` 排除，**不会**上传到 GitHub，你的密钥是安全的。

本地测试：

```bash
npm install
npm run dev
```

打开浏览器 → 点"管理员入口" → 用你创建的管理员邮箱和密码登录。

---

## 4. GitHub 仓库设置

### 4.1 初始化 Git

在项目目录打开终端：

```bash
cd ~/Downloads/copy-of-copy-of-tsinghua-sem-ai-screener
git init
git add .
git commit -m "Initial commit: BID AI Screener"
```

### 4.2 创建 GitHub 仓库

1. 打开 https://github.com/new
2. **Repository name**：`tsinghua-bid-screener`
3. **Visibility**：Public 或 Private 均可（`.env.local` 不会上传，密钥安全）
4. **不要**勾选 "Add README"、"Add .gitignore" 等选项
5. 点 **"Create repository"**

### 4.3 生成 Personal Access Token

GitHub **不再支持密码认证**，需要 Token：

1. 打开 https://github.com/settings/tokens/new
2. **Note**：随便写，如 `push`
3. **Expiration**：选 `90 days` 或 `No expiration`
4. **勾选** `repo`（第一个大勾，包含所有子项）
5. 点底部绿色 **"Generate token"**
6. **立即复制**生成的 Token（以 `ghp_` 开头），这个只显示一次！

### 4.4 推送代码到 GitHub

```bash
git remote add origin https://github.com/你的用户名/tsinghua-bid-screener.git
git branch -M main
git push -u origin main
```

- **Username** 输入：你的 GitHub 用户名
- **Password** 输入：**粘贴 Token**（不是 GitHub 密码）
- 粘贴时终端不显示任何字符，这是正常的，直接按回车

看到类似以下输出即为成功：

```
To https://github.com/xxx/tsinghua-bid-screener.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

---

## 5. Vercel 部署（网站上线）

### 5.1 导入项目

1. 打开 https://vercel.com ，用 **GitHub 账号**登录
2. 点 **"Add New..."** → **"Project"**
3. 找到 `tsinghua-bid-screener` 仓库，点 **"Import"**
4. Vercel 会自动检测到 Vite 项目，无需修改构建设置

### 5.2 设置环境变量

在部署页面展开 **"Environment Variables"**，逐个添加：

| Name（手动输入，不要复制粘贴避免带空格） | Value |
|------|-------|
| `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon public key |
| `GEMINI_API_KEY` | 你的 Gemini API Key（选填） |

> **重要提示**：Name 字段建议**手动输入**而非复制粘贴，避免带入隐藏空格导致报错 "The name contains invalid characters"。

### 5.3 部署

1. 点 **"Deploy"**
2. 等待约 30 秒 ~ 1 分钟构建完成
3. 部署成功后会获得公网地址，如 `tsinghua-bid-screener.vercel.app`

### 5.4 自动部署机制（CI/CD）

部署完成后，Vercel 会自动监听 GitHub 仓库：

```
修改代码 → git add → git commit → git push → Vercel 自动重新构建 → 网站 30 秒内更新
```

**你不需要做任何额外配置**，这就是 Vercel 的核心功能。

### 5.5 绑定自定义域名（可选）

1. Vercel 项目 → **Settings** → **Domains**
2. 输入你的域名（如 `screener.bid.tsinghua.edu.cn`）
3. 按提示在你的域名 DNS 设置中添加 CNAME 记录：
   - **类型**：CNAME
   - **名称**：`screener`（或你选的子域名）
   - **值**：`cname.vercel-dns.com`
4. 等待 DNS 生效（通常几分钟到几小时）

---

## 6. 上线后验证

### 6.1 候选人端测试

1. 用手机或电脑打开 https://tsinghua-bid-screener.vercel.app
2. 随意填写测试数据（不用完成整个面试流程）
3. 提交后数据应自动保存到 Supabase

### 6.2 管理员端测试

1. 打开网站 → 点 **"管理员入口"**
2. 用 Supabase 创建的管理员邮箱和密码登录
3. 检查人才库中是否能看到刚才提交的测试数据

### 6.3 数据库验证

1. 打开 Supabase Dashboard → **Table Editor** → `candidates` 表
2. 确认刚才提交的测试数据出现在表中

---

## 7. 日常维护

### 7.1 修改代码

```bash
# 1. 在本地修改代码
# 2. 提交并推送
git add .
git commit -m "描述你的修改"
git push

# 3. Vercel 自动重新部署，30 秒内网站更新
```

### 7.2 查看候选人数据

**方式一**：通过网站管理后台
- 打开网站 → 管理员入口 → 登录 → 人才库

**方式二**：通过 Supabase Dashboard
- 打开 https://supabase.com/dashboard/project/vspohrqwtedhkstupgdm
- 左侧 **Table Editor** → `candidates` 表

### 7.3 导出数据

- 管理后台的人才库页面有导出功能
- 也可以在 Supabase Dashboard → Table Editor → candidates → 右上角 **"Export"** 导出 CSV

### 7.4 添加/修改管理员

1. Supabase Dashboard → **Authentication** → **Users**
2. 点 **"Add user"** → 创建新管理员
3. 或点已有用户进行密码重置

### 7.5 更新环境变量

1. Vercel Dashboard → `tsinghua-bid-screener` 项目
2. **Settings** → **Environment Variables**
3. 修改后需要 **重新部署**：Deployments → 最新一条 → Redeploy

### 7.6 查看部署日志

如果网站出问题：
1. Vercel Dashboard → **Deployments** → 点击最新部署
2. 查看 **Build Logs** 寻找错误信息

---

## 8. 项目所有权转移

当需要把项目交给其他人（如新一届负责人）时，需要转移 3 个平台的权限：

### 需要转移的平台

| # | 平台 | 转移方式 | 预计时间 |
|---|------|---------|---------|
| 1 | GitHub 仓库 | 转让所有权 或 加 Collaborator | 2 分钟 |
| 2 | Vercel 项目 | Transfer Project | 2 分钟 |
| 3 | Supabase 项目 | 邀请为 Organization Owner | 2 分钟 |

> 全部操作约 10 分钟可以完成。

---

### 8.1 GitHub 仓库转移

#### 方法 A — 转让所有权（推荐，完全交出控制权）

1. 打开 https://github.com/Roger-2022/tsinghua-bid-screener/settings
2. 拉到最下面 **"Danger Zone"** 区域
3. 点 **"Transfer ownership"**
4. 输入接收人的 GitHub 用户名
5. 确认仓库名称
6. 对方会收到邮件确认，接受后仓库转到对方名下
7. 原有链接会自动重定向到新地址

#### 方法 B — 加 Collaborator（你保留所有权，给对方管理权限）

1. 打开 https://github.com/Roger-2022/tsinghua-bid-screener/settings/access
2. 点 **"Add people"**
3. 输入对方 GitHub 用户名
4. 权限选 **Admin**（拥有除删除仓库外的所有权限）

---

### 8.2 Vercel 项目转移

1. 打开 Vercel Dashboard → `tsinghua-bid-screener` 项目
2. 进入 **Settings** → **General**
3. 拉到底部找到 **"Transfer Project"**
4. 输入对方的 Vercel Team 名称或用户名
5. 对方确认接收
6. **环境变量会一起转移**，不需要重新配置

> **注意**：如果转让了 GitHub 仓库，Vercel 项目需要重新关联到新的 GitHub 仓库地址。在 Vercel Settings → Git → Connected Git Repository 中更新。

---

### 8.3 Supabase 项目转移

#### 方法 A — 直接邀请为 Owner（推荐）

1. 打开 Supabase Dashboard
2. 点击左上角 Organization 名称 → **Settings**
3. 点 **"Members"** 标签
4. 邀请对方邮箱，角色选 **Owner**
5. 对方接受邀请后，你可以把自己降为 Member 或离开 Organization

#### 方法 B — 对方重建（如果对方想用自己的 Supabase 账号）

1. **导出数据**：
   - Supabase Dashboard → **Settings** → **Database** → **Connection string** → 复制
   - 或在 Table Editor → candidates → Export CSV
2. **对方操作**：
   - 创建新的 Supabase 项目
   - 在 SQL Editor 运行本文档第 3.2 节的建表 SQL
   - 导入数据
3. **更新 Vercel 环境变量**：
   - `VITE_SUPABASE_URL` → 新的 Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` → 新的 anon key
4. 重新部署 Vercel

---

### 8.4 转移后需要告知对方的信息

| 信息 | 内容 |
|------|------|
| 管理员邮箱 | 你创建的管理员邮箱 |
| 管理员密码 | 你设置的管理员密码（建议对方登录后立即修改） |
| Supabase 数据库密码 | 创建项目时设的密码 |
| Gemini API Key | 如果使用了 AI 面试功能 |

---

## 9. 交接清单模板

转移时填写以下清单发给接收方：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BID AI Screener 项目交接清单
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GitHub 仓库
   地址: https://github.com/Roger-2022/tsinghua-bid-screener
   操作: [  ] 已转让所有权 / [  ] 已加为 Admin Collaborator

2. Vercel 项目
   网站地址: https://tsinghua-bid-screener.vercel.app
   操作: [  ] 已转让到接收方 Team

3. Supabase 项目
   Dashboard: https://supabase.com/dashboard/project/vspohrqwtedhkstupgdm
   操作: [  ] 已邀请为 Organization Owner
   数据库密码: ____________________（私信发送）

4. 管理员账号
   邮箱: ____________________
   密码: ____________________（私信发送，请立即修改）

5. API Keys
   Gemini API Key: ____________________（已配置在 Vercel 环境变量中）

6. 接收方验证
   [  ] 能 git clone 并 git push 代码到仓库
   [  ] push 后网站能自动更新
   [  ] 能用管理员账号登录网站查看候选人数据
   [  ] 能在 Supabase Dashboard 看到 candidates 表

7. 日常维护速查
   修改代码:     编辑代码 → git push → 30 秒自动更新
   查看数据:     网站管理后台 或 Supabase Table Editor
   导出数据:     管理后台人才库导出 或 Supabase Export CSV
   添加管理员:   Supabase → Authentication → Users → Add user
   更新环境变量: Vercel → Settings → Environment Variables → 修改后 Redeploy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. 常见问题

### Q: 网站打不开 / 加载很慢怎么办？

- **Vercel 在国内可能偶尔较慢**，可以考虑绑定自定义域名并使用 CDN
- 检查 Vercel Dashboard → Deployments 最新部署是否成功

### Q: 管理员登录失败怎么办？

1. 确认邮箱和密码正确
2. 检查 Supabase → Authentication → Users 中该用户状态是否为 "Confirmed"
3. 如果忘记密码，在 Supabase Users 页面可以重置

### Q: 候选人提交的数据没出现在管理后台？

1. 检查 Supabase Dashboard → Table Editor → candidates 是否有数据
2. 如果 Supabase 中没有数据，可能是网络问题导致只存在了 localStorage
3. 检查 Vercel 环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确

### Q: 怎么修改网站内容？

1. 在本地用代码编辑器修改文件
2. 运行 `npm run dev` 本地预览确认
3. 确认后：
   ```bash
   git add .
   git commit -m "修改了xxx"
   git push
   ```
4. 等 30 秒，网站自动更新

### Q: 怎么完全重置系统？

1. 清空候选人数据：Supabase → SQL Editor → 运行 `DELETE FROM candidates;`
2. 重置管理员：Supabase → Authentication → Users → 删除旧用户 → 创建新用户

### Q: 环境变量在哪里配置？

| 环境 | 位置 |
|------|------|
| 本地开发 | 项目根目录 `.env.local` 文件 |
| 线上网站 | Vercel Dashboard → Settings → Environment Variables |

> 修改线上环境变量后需要在 Vercel 重新部署才会生效。

---

*本文档最后更新：2026 年 2 月*
*由 Claude 辅助生成*
