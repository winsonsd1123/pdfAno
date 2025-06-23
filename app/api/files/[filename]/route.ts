import { NextRequest, NextResponse } from 'next/server'
import { head, del } from '@vercel/blob'
import { API_CONFIG } from '@/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params
    const filename = decodeURIComponent(rawFilename)
    
    if (!API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob存储未配置' }, { status: 500 })
    }

    // 确保文件是PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: '只支持PDF文件' }, { status: 400 })
    }

    try {
      // 检查文件是否存在
      const blob = await head(filename, {
        token: API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN,
      })

      // 直接重定向到blob URL
      return NextResponse.redirect(blob.url, {
        status: 302,
        headers: {
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } catch (blobError) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

  } catch (error) {
    console.error('获取文件错误:', error)
    return NextResponse.json({ error: '获取文件失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params
    const filename = decodeURIComponent(rawFilename)
    
    if (!API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob存储未配置' }, { status: 500 })
    }

    try {
      // 检查文件是否存在
      await head(filename, {
        token: API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN,
      })

      // 删除文件
      await del(filename, {
        token: API_CONFIG.BLOB_STORAGE.READ_WRITE_TOKEN,
      })
      
      return NextResponse.json({ message: '文件删除成功' })
    } catch (blobError) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json({ error: '文件删除失败' }, { status: 500 })
  }
} 