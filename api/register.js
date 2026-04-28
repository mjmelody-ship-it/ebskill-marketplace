// ============================================
// 用户注册接口
// POST /api/register
// 接收 { email, password, code }
// 先验证验证码，密码用 SHA-256 hash，存入 Supabase users 表
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
    const { email, password, code } = req.body;

    // 参数校验
    if (!email || !password || !code) {
      return res.status(400).json({ error: '请提供邮箱、密码和验证码' });
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 密码长度校验
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 第一步：验证验证码
    const { data: codeRecords, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', true)  // 注册时验证码已被 verify-code 标记为已使用
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError) {
      console.error('查询验证码失败:', codeError);
      return res.status(500).json({ error: '验证失败，请稍后重试' });
    }

    // 检查验证码是否存在且未过期
    if (!codeRecords || codeRecords.length === 0) {
      return res.status(400).json({ error: '请先获取并验证验证码' });
    }

    const codeRecord = codeRecords[0];
    if (new Date(codeRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }

    // 第二步：检查用户是否已存在
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('查询用户失败:', checkError);
      return res.status(500).json({ error: '注册失败，请稍后重试' });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: '该邮箱已注册' });
    }

    // 第三步：对密码进行 SHA-256 hash
    const passwordHash = hashPassword(password);

    // 第四步：创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: passwordHash
      })
      .select('id, email, created_at')
      .single();

    if (insertError) {
      console.error('创建用户失败:', insertError);
      return res.status(500).json({ error: '注册失败，请稍后重试' });
    }

    // 返回成功
    return res.status(200).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email
      },
      message: '注册成功'
    });

  } catch (error) {
    console.error('注册异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
