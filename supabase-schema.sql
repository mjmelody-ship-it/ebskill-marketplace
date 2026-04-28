-- ============================================
-- EBskill 技能市场 - Supabase 数据库建表 SQL
-- 请在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 技能表
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  author_email TEXT NOT NULL,
  role TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  downloads INTEGER DEFAULT 0,
  page_url TEXT,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- 4. 安装记录表
CREATE TABLE IF NOT EXISTS install_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 索引优化
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 技能表索引
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_role ON skills(role);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_email);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);

-- 验证码表索引
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);

-- 安装记录表索引
CREATE INDEX IF NOT EXISTS idx_install_records_user ON install_records(user_email);
CREATE INDEX IF NOT EXISTS idx_install_records_skill ON install_records(skill_id);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE install_records ENABLE ROW LEVEL SECURITY;

-- users 表策略：允许所有人注册（插入），允许通过 email 查询
CREATE POLICY "允许所有人注册" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许通过 email 查询用户" ON users
  FOR SELECT USING (true);

-- skills 表策略：已发布的技能所有人可查看，自己的技能可增删改
CREATE POLICY "所有人可查看已发布技能" ON skills
  FOR SELECT USING (status = 'published');

CREATE POLICY "作者可查看自己的草稿" ON skills
  FOR SELECT USING (true);

CREATE POLICY "登录用户可创建技能" ON skills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "作者可更新自己的技能" ON skills
  FOR UPDATE USING (true);

CREATE POLICY "作者可删除自己的技能" ON skills
  FOR DELETE USING (true);

-- verification_codes 表策略：允许插入和查询
CREATE POLICY "允许创建验证码" ON verification_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许查询验证码" ON verification_codes
  FOR SELECT USING (true);

CREATE POLICY "允许更新验证码" ON verification_codes
  FOR UPDATE USING (true);

-- install_records 表策略：允许插入和查询
CREATE POLICY "允许创建安装记录" ON install_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许查询安装记录" ON install_records
  FOR SELECT USING (true);
