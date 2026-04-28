// ============================================
// 用户登录接口
// POST /api/login
// 接收 { email, password }
// 查询 Supabase users 表验证邮箱和密码
// ============================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 初始化 Supabase 客户端（使用 service_role 密钥）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 使用 SHA-256 对密码进行 hash
 * @param {string} password - 原始密码
 * @returns {string} - SHA-256 hash 字符串
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  try {
    const { email, password } = req.body;

    // 参数校验
    if (!email || !password) {
      return res.status(400).json({ error: '请提供邮箱和密码' });
    }

    // 对输入密码进行 SHA-256 hash
    const passwordHash = hashPassword(password);

    // 查询用户
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, password_hash, created_at')
      .eq('email', email)
      .limit(1);

    if (queryError) {
      console.error('查询用户失败:', queryError);
      return res.status(500).json({ error: '登录失败，请稍后重试' });
    }

    // 检查用户是否存在
    if (!users || users.length === 0) {
      return res.status(200).json({ success: false, error: '邮箱或密码错误' });
    }

    const user = users[0];

    // 验证密码
    if (user.password_hash !== passwordHash) {
      return res.status(200).json({ success: false, error: '邮箱或密码错误' });
    }

    // 登录成功，返回用户信息（不返回密码hash）
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error('登录异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
