// ============================================
// 验证码校验接口
// POST /api/verify-code
// 接收 { email, code }，查询 Supabase 验证验证码是否有效
// ============================================

import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端（使用 service_role 密钥）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { email, code } = req.body;

    // 参数校验
    if (!email || !code) {
      return res.status(400).json({ error: '请提供邮箱和验证码' });
    }

    // 查询验证码记录
    const { data: records, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('查询验证码失败:', queryError);
      return res.status(500).json({ error: '验证失败，请稍后重试' });
    }

    // 检查是否找到验证码
    if (!records || records.length === 0) {
      return res.status(200).json({ success: false, error: '验证码错误' });
    }

    const record = records[0];

    // 检查验证码是否过期
    if (new Date(record.expires_at) < new Date()) {
      return res.status(200).json({ success: false, error: '验证码已过期' });
    }

    // 验证成功，标记验证码为已使用
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', record.id);

    if (updateError) {
      console.error('更新验证码状态失败:', updateError);
      // 不影响主流程，继续返回成功
    }

    return res.status(200).json({ success: true, message: '验证成功' });

  } catch (error) {
    console.error('验证码校验异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
