import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { API_CONFIG } from '@/lib/config'

// 验证文件名是否符合规范
function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // 检查文件是否是PDF
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: '文件必须是PDF格式' }
  }

  // 移除.pdf扩展名进行名称验证
  const nameWithoutExt = fileName.slice(0, -4)
  
  // 检查是否为空
  if (!nameWithoutExt.trim()) {
    return { valid: false, error: '文件名不能为空' }
  }

  // 检查是否只包含英文字母、数字、下划线和连字符
  const validPattern = /^[a-zA-Z0-9_-]+$/
  if (!validPattern.test(nameWithoutExt)) {
    return { valid: false, error: '文件名只能包含英文字母、数字、下划线(_)和连字符(-)，不能包含空格或其他特殊字符' }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有文件被上传' }, { status: 400 })
    }

    if (!API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob存储未配置' }, { status: 500 })
    }

    const uploadedFiles = []
    const errors = []

    for (const file of files) {
      // 检查文件类型
      if (file.type !== 'application/pdf') {
        errors.push(`文件 "${file.name}" 不是PDF格式`)
        continue
      }

      // 验证文件名
      const validation = validateFileName(file.name)
      if (!validation.valid) {
        errors.push(`文件 "${file.name}" 名称不符合规范：${validation.error}`)
        continue
      }

      try {
        // 上传文件到Vercel Blob存储
        const blob = await put(file.name, file, {
          access: 'public',
          token: API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN,
        })
        
        uploadedFiles.push({
          name: blob.pathname,
          originalName: file.name,
          size: file.size,
          path: blob.url,
          uploadTime: new Date().toISOString()
        })
      } catch (blobError) {
        console.error(`上传文件 ${file.name} 到blob存储失败:`, blobError)
        errors.push(`文件 "${file.name}" 上传失败`)
        continue
      }
    }

    // 如果有上传成功的文件，返回成功响应
    if (uploadedFiles.length > 0) {
      const response = { 
        message: '文件上传成功',
        files: uploadedFiles 
      }
      
      // 如果有错误，也一并返回
      if (errors.length > 0) {
        response.message = `部分文件上传成功，${errors.length}个文件失败`
        // @ts-ignore
        response.errors = errors
      }
      
      return NextResponse.json(response)
    } else {
      // 如果没有文件上传成功，返回错误
      return NextResponse.json({ 
        error: '没有文件上传成功', 
        details: errors 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
} 