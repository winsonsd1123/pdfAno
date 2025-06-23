import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'
import { API_CONFIG } from '@/lib/config'

export async function GET() {
  try {
    if (!API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob存储未配置' }, { status: 500 })
    }

    const { blobs } = await list({
      token: API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN,
    })

    // 调试信息：显示所有blob
    console.log('All blobs in storage:', blobs.map(blob => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    })))

    const pdfFiles = []

    for (const blob of blobs) {
      if (blob.pathname.toLowerCase().endsWith('.pdf')) {
        console.log('Processing PDF blob:', {
          pathname: blob.pathname,
          url: blob.url
        })
        
        // 从URL中提取实际的文件名
        const urlParts = blob.url.split('/')
        const actualFileName = urlParts[urlParts.length - 1]
        
        console.log('Extracted actual filename:', actualFileName)
        
        pdfFiles.push({
          name: actualFileName, // 使用从URL提取的实际文件名
          originalName: blob.pathname, // 使用原始文件名作为显示名称
          size: blob.size,
          uploadTime: blob.uploadedAt,
          id: actualFileName, // 使用实际文件名作为ID
          url: blob.url // 保留实际的blob URL
        })
      }
    }

    // 按修改时间倒序排列
    pdfFiles.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime())

    console.log('Returning PDF files:', pdfFiles)

    return NextResponse.json({ files: pdfFiles })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 })
  }
} 