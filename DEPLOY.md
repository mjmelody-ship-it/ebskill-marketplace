# EBskill 技能市场 - 部署指南

本文档介绍如何将 EBskill 技能市场部署到 Vercel。

## 前置条件

- [Supabase](https://supabase.com/) 账号
- [Vercel](https://vercel.com/) 账号
- [GitHub](https://github.com/) 账号
- [Node.js](https://nodejs.org/) 18+ 本地环境（可选，用于本地测试）

---

## 第一步：配置 Supabase 数据库

### 1.1 创建 Supabase 项目

1. 登录 [Supabase 控制台](https://app.supabase.com/)
2. 点击 **New Project** 创建新项目
3. 设置项目名称和数据库密码
4. 选择离你最近的区域
5. 等待项目创建完成

### 1.2 执行数据库建表 SQL

1. 在 Supabase 控制台中，点击左侧菜单的 **SQL Editor**
2. 点击 **New Query**
3. 将 `supabase-schema.sql` 文件的内容粘贴到编辑器中
4. 点击 **Run** 执行 SQL
5. 确认所有表和索引创建成功

### 1.3 创建 Storage Bucket

1. 在 Supabase 控制台中，点击左侧菜单的 **Storage**
2. 点击 **New Bucket**
3. Bucket 名称填写：`skill-files`
4. 勾选 **Public bucket**（允许公开访问文件）
5. 点击 **Create bucket**

### 1.4 获取 API 密钥

1. 在 Supabase 控制台中，点击左侧菜单的 **Settings** > **API**
2. 记录以下信息：
   - **Project URL**（即 Supabase URL）
   - **service_role** key（注意保密！）
   - **anon** / public key

---

## 第二步：配置 Resend 邮件服务

### 2.1 创建 Resend 账号

1. 注册 [Resend](https://resend.com/) 账号
2. 登录后进入 [API Keys](https://resend.com/api-keys) 页面
3. 点击 **Create API Key**
4. 复制生成的 API Key

### 2.2 验证发件域名（可选）

- 开发阶段可以直接使用 `onboarding@resend.dev` 作为发件邮箱
- 生产环境建议配置自定义域名，在 Resend 的 **Domains** 页面添加并验证

---

## 第三步：推送到 GitHub

### 3.1 初始化 Git 仓库

```bash
cd /path/to/EBskill
git init
git add .
git commit -m "初始化 EBskill 技能市场项目"
```

### 3.2 创建 GitHub 仓库

1. 在 GitHub 上创建一个新的私有仓库
2. 推送代码

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

> **注意**：确保 `.env` 文件已添加到 `.gitignore` 中，不要将密钥推送到 GitHub！

---

## 第四步：在 Vercel 中导入项目

### 4.1 导入项目

1. 登录 [Vercel 控制台](https://vercel.com/dashboard)
2. 点击 **Add New** > **Project**
3. 选择你的 GitHub 仓库
4. 点击 **Import**

### 4.2 配置构建设置

Vercel 会自动检测到项目配置，通常不需要额外设置：
- **Framework Preset**: Other
- **Build Command**: 留空
- **Output Directory**: `.`

---

## 第五步：配置环境变量

在 Vercel 项目的 **Settings** > **Environment Variables** 中添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥 | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Supabase anon 公开密钥 | `eyJhbGci...` |
| `RESEND_API_KEY` | Resend API 密钥 | `re_xxxxxxxx` |
| `RESEND_FROM_EMAIL` | Resend 发件邮箱 | `onboarding@resend.dev` |

> **重要**：确保在 Production、Preview、Development 三个环境中都配置了这些变量。

---

## 第六步：部署

### 6.1 自动部署

配置完成后，Vercel 会自动触发首次部署。等待几分钟后，你将获得一个类似 `https://your-project.vercel.app` 的访问地址。

### 6.2 后续更新

每次向 GitHub 的 `main` 分支推送代码时，Vercel 会自动重新部署。

---

## 本地开发（可选）

### 安装依赖

```bash
npm install
```

### 安装 Vercel CLI

```bash
npm i -g vercel
```

### 本地运行

```bash
# 链接 Vercel 项目（首次）
vercel link

# 拉取环境变量
vercel env pull .env.local

# 启动本地开发服务器
vercel dev
```

本地开发服务器默认运行在 `http://localhost:3000`。

---

## API 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/send-code` | 发送验证码 |
| POST | `/api/verify-code` | 校验验证码 |
| POST | `/api/register` | 用户注册 |
| POST | `/api/login` | 用户登录 |
| GET | `/api/skills` | 获取技能列表 |
| POST | `/api/skills` | 创建技能 |
| DELETE | `/api/skills` | 删除技能 |
| POST | `/api/upload` | 文件上传 |

---

## 常见问题

### Q: 部署后 API 返回 500 错误
A: 检查 Vercel 环境变量是否正确配置，特别是 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。

### Q: 验证码邮件发送失败
A: 检查 `RESEND_API_KEY` 是否正确，以及 `RESEND_FROM_EMAIL` 是否已验证。

### Q: 文件上传失败
A: 确认 Supabase Storage 中已创建 `skill-files` bucket，并且设置为公开访问。

### Q: CORS 跨域错误
A: 检查 `vercel.json` 中的 CORS 配置，确保 `Access-Control-Allow-Origin` 设置正确。
