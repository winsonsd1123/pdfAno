import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { API_CONFIG } from '@/lib/config'

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

    for (const file of files) {
      // 检查文件类型
      if (file.type !== 'application/pdf') {
        continue // 跳过非PDF文件
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
        continue
      }
    }

    return NextResponse.json({ 
      message: '文件上传成功',
      files: uploadedFiles 
    })

  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
} 