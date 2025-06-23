import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有文件被上传' }, { status: 400 })
    }

    // 确保uploads目录存在
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      // 检查文件类型
      if (file.type !== 'application/pdf') {
        continue // 跳过非PDF文件
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // 使用原始文件名，如果重名则覆盖
      const filePath = path.join(uploadsDir, file.name)
      
      // 写入文件
      await writeFile(filePath, buffer)
      
      uploadedFiles.push({
        name: file.name,
        size: file.size,
        path: filePath,
        uploadTime: new Date().toISOString()
      })
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