// ============================================
// 发送验证码接口
// POST /api/send-code
// 接收 { email }，生成6位验证码并存入 Supabase，通过 Resend 发送邮件
// ============================================

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 初始化 Supabase 客户端（使用 service_role 密钥，拥有完全访问权限）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 初始化 Resend 邮件服务
const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { email } = req.body;

    // 参数校验
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }

    // 简单的邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 生成6位随机验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 验证码5分钟后过期
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 将验证码存入 Supabase
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email: email,
        code: code,
        expires_at: expiresAt,
        used: false
      });

    if (dbError) {
      console.error('数据库写入失败:', dbError);
      return res.status(500).json({ error: '验证码生成失败，请稍后重试' });
    }

    // 通过 Resend 发送验证码邮件
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'EBskill 技能市场 - 验证码',
      html: `
        <div style="max-width: 480px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h2 style="color: #333; text-align: center;">EBskill 技能市场</h2>
          <p style="color: #666; font-size: 16px;">您好，您的验证码是：</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</span>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">验证码5分钟内有效，请勿泄露给他人。</p>
        </div>
      `
    });

    if (emailError) {
      console.error('邮件发送失败:', emailError);
      return res.status(500).json({ error: '验证码发送失败，请稍后重试' });
    }

    // 返回成功（注意：不要在响应中返回验证码）
    return res.status(200).json({ success: true, message: '验证码已发送' });

  } catch (error) {
    console.error('发送验证码异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
