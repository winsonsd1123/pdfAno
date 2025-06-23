import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads')
    
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = await readdir(uploadsDir)
    const pdfFiles = []

    for (const fileName of files) {
      if (fileName.toLowerCase().endsWith('.pdf')) {
        const filePath = path.join(uploadsDir, fileName)
        const stats = await stat(filePath)
        
        pdfFiles.push({
          name: fileName,
          size: stats.size,
          uploadTime: stats.mtime.toISOString(),
          id: fileName // 使用文件名作为ID
        })
      }
    }

    // 按修改时间倒序排列
    pdfFiles.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime())

    return NextResponse.json({ files: pdfFiles })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 })
  }
} 