// ============================================
// 文件上传接口
// POST /api/upload
// 接收 multipart/form-data，将文件上传到 Supabase Storage
// 返回文件公开访问 URL
// ============================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 初始化 Supabase 客户端（使用 service_role 密钥）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Storage bucket 名称
const BUCKET_NAME = 'skill-files';

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
    // Vercel Serverless Function 中解析 multipart/form-data
    // 从 req.body 中获取文件信息（Vercel 会自动解析）
    const { file, filename, skill_id, author_email } = req.body;

    // 参数校验
    if (!file) {
      return res.status(400).json({ error: '请提供要上传的文件' });
    }

    if (!filename) {
      return res.status(400).json({ error: '请提供文件名' });
    }

    // 生成唯一文件名，避免冲突
    const fileExt = filename.split('.').pop();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExt}`;
    const filePath = `${author_email || 'anonymous'}/${uniqueName}`;

    // 将 Base64 数据转换为 Buffer
    // 前端上传时需要将文件转为 base64 格式
    let fileBuffer;
    if (typeof file === 'string') {
      // 移除 data URI 前缀（如果有）
      const base64Data = file.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: '文件格式不支持，请使用 Base64 编码' });
    }

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: getContentType(fileExt),
        upsert: false
      });

    if (uploadError) {
      console.error('文件上传失败:', uploadError);
      return res.status(500).json({ error: '文件上传失败' });
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    const fileUrl = urlData.publicUrl;

    // 如果提供了 skill_id，更新技能表的 download_url
    if (skill_id) {
      await supabase
        .from('skills')
        .update({ download_url: fileUrl })
        .eq('id', skill_id);
    }

    return res.status(200).json({
      success: true,
      url: fileUrl,
      path: uploadData.path,
      message: '文件上传成功'
    });

  } catch (error) {
    console.error('文件上传异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}

/**
 * 根据文件扩展名获取 Content-Type
 * @param {string} ext - 文件扩展名
 * @returns {string} - Content-Type
 */
function getContentType(ext) {
  const contentTypes = {
    'json': 'application/json',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'zip': 'application/zip',
    'pdf': 'application/pdf'
  };
  return contentTypes[ext?.toLowerCase()] || 'application/octet-stream';
}
