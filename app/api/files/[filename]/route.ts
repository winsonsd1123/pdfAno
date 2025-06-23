import { NextRequest, NextResponse } from 'next/server'
import { unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params
    const filename = decodeURIComponent(rawFilename)
    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    // 确保文件是PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: '只支持PDF文件' }, { status: 400 })
    }

    const fileBuffer = await readFile(filePath)
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })

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
    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    await unlink(filePath)
    
    return NextResponse.json({ message: '文件删除成功' })

  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json({ error: '文件删除失败' }, { status: 500 })
  }
} 