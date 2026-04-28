// ============================================
// 技能 CRUD 接口
// GET    /api/skills       - 获取所有已发布技能列表
// GET    /api/skills?role=xxx - 按岗位筛选
// POST   /api/skills       - 创建技能（需要登录）
// DELETE /api/skills?id=xxx - 删除技能（需要登录，只能删自己的）
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ==================
    // GET - 获取技能列表
    // ==================
    if (req.method === 'GET') {
      const { role, author_email, status, page = 1, limit = 20 } = req.query;

      // 构建查询
      let query = supabase
        .from('skills')
        .select('id, name, description, author_email, role, tags, status, downloads, page_url, download_url, created_at, updated_at')
        .order('created_at', { ascending: false });

      // 按岗位筛选
      if (role) {
        query = query.eq('role', role);
      }

      // 按作者筛选
      if (author_email) {
        query = query.eq('author_email', author_email);
      }

      // 按状态筛选（默认只显示已发布的）
      const filterStatus = status || 'published';
      query = query.eq('status', filterStatus);

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: skills, error, count } = await query;

      if (error) {
        console.error('查询技能失败:', error);
        return res.status(500).json({ error: '获取技能列表失败' });
      }

      return res.status(200).json({
        success: true,
        data: skills,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // ==================
    // POST - 创建技能
    // ==================
    if (req.method === 'POST') {
      const { name, description, author_email, role, tags, status, page_url, download_url } = req.body;

      // 参数校验
      if (!name || !author_email) {
        return res.status(400).json({ error: '技能名称和作者邮箱不能为空' });
      }

      // 构建插入数据
      const insertData = {
        name,
        description: description || '',
        author_email,
        role: role || '',
        tags: tags || [],
        status: status || 'draft',
        page_url: page_url || '',
        download_url: download_url || '',
        downloads: 0
      };

      const { data: newSkill, error: insertError } = await supabase
        .from('skills')
        .insert(insertData)
        .select('id, name, description, author_email, role, tags, status, downloads, page_url, download_url, created_at, updated_at')
        .single();

      if (insertError) {
        console.error('创建技能失败:', insertError);
        return res.status(500).json({ error: '创建技能失败' });
      }

      return res.status(201).json({
        success: true,
        data: newSkill,
        message: '技能创建成功'
      });
    }

    // ==================
    // DELETE - 删除技能
    // ==================
    if (req.method === 'DELETE') {
      const { id, author_email } = req.body;

      // 参数校验
      if (!id) {
        return res.status(400).json({ error: '请提供技能ID' });
      }

      if (!author_email) {
        return res.status(400).json({ error: '请提供作者邮箱进行身份验证' });
      }

      // 先查询技能，确认是作者本人
      const { data: existingSkill, error: queryError } = await supabase
        .from('skills')
        .select('id, author_email')
        .eq('id', id)
        .single();

      if (queryError || !existingSkill) {
        return res.status(404).json({ error: '技能不存在' });
      }

      // 验证是否是作者本人
      if (existingSkill.author_email !== author_email) {
        return res.status(403).json({ error: '无权删除他人的技能' });
      }

      // 删除技能
      const { error: deleteError } = await supabase
        .from('skills')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('删除技能失败:', deleteError);
        return res.status(500).json({ error: '删除技能失败' });
      }

      return res.status(200).json({
        success: true,
        message: '技能删除成功'
      });
    }

    // 不支持的请求方法
    return res.status(405).json({ error: '不支持的请求方法' });

  } catch (error) {
    console.error('技能接口异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
