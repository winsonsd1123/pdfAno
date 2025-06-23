import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFNumber, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

interface Annotation {
  id: string
  page: number
  author: string
  content: string
  timestamp: string | Date
  x: number
  y: number
  width: number
  height: number
  selectedText: string
  type: "highlight" | "comment"
}

export async function POST(request: NextRequest) {
  try {
    const { filename, annotations } = await request.json()
    
    if (!filename || !annotations) {
      return NextResponse.json({ error: 'Missing filename or annotations' }, { status: 400 })
    }

    // 读取原始PDF文件
    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const existingPdfBytes = fs.readFileSync(filePath)
    
    // 加载PDF文档
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const pages = pdfDoc.getPages()
    
    // 注册 fontkit
    pdfDoc.registerFontkit(fontkit)

    // 嵌入字体用于注释文本
    const fontBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'SourceHanSansCN-Regular.otf'))
    const font = await pdfDoc.embedFont(fontBytes)
    
    // 按页面分组注释
    const annotationsByPage = annotations.reduce((acc: any, annotation: any) => {
      if (!acc[annotation.page]) {
        acc[annotation.page] = []
      }
      acc[annotation.page].push(annotation)
      return acc
    }, {})
    
    // 为每个页面添加真正的PDF注释
    Object.keys(annotationsByPage).forEach((pageNum) => {
      const pageIndex = parseInt(pageNum) - 1
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex]
        const pageHeight = page.getHeight()
        const pageAnnotations = annotationsByPage[pageNum]
        
        pageAnnotations.forEach((annotation: any) => {
          // 转换坐标系统（PDF坐标系从左下角开始）
          const pdfY = pageHeight - annotation.y - annotation.height
          
          if (annotation.type === 'highlight') {
            // 创建高亮注释
            const highlightAnnotation = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Highlight',
              Rect: [annotation.x, pdfY, annotation.x + annotation.width, pdfY + annotation.height],
              Contents: PDFHexString.fromText(annotation.content || ''),
              T: PDFHexString.fromText(annotation.author || 'User'),
              M: `D:${new Date(annotation.timestamp).toISOString().replace(/[-:T]/g, '').substring(0, 14)}Z`,
              C: [1, 1, 0], // 黄色高亮
              CA: 0.5, // 透明度
              QuadPoints: [
                annotation.x, pdfY + annotation.height,
                annotation.x + annotation.width, pdfY + annotation.height,
                annotation.x, pdfY,
                annotation.x + annotation.width, pdfY
              ],
              F: 4, // 可打印标志
              P: page.ref,
            })
            
            // 安全地获取或创建页面注释数组
            let pageAnnots = page.node.get(PDFName.of('Annots')) as PDFArray
            if (!pageAnnots || !(pageAnnots instanceof PDFArray)) {
              pageAnnots = PDFArray.withContext(pdfDoc.context)
              page.node.set(PDFName.of('Annots'), pageAnnots)
            }
            pageAnnots.push(highlightAnnotation)
            
          } else if (annotation.type === 'comment') {
            // 创建带背景色的高亮注释（浅蓝色背景，包含完整注释信息）
            const commentAnnotation = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Highlight',
              Rect: [annotation.x, pdfY, annotation.x + annotation.width, pdfY + annotation.height],
              Contents: PDFHexString.fromText(annotation.content || ''),
              T: PDFHexString.fromText(annotation.author || 'User'),
              M: `D:${new Date(annotation.timestamp).toISOString().replace(/[-:T]/g, '').substring(0, 14)}Z`,
              C: [0.8, 0.9, 1], // 浅蓝色背景
              CA: 0.3, // 较低的透明度，让文字更明显
              QuadPoints: [
                annotation.x, pdfY + annotation.height,
                annotation.x + annotation.width, pdfY + annotation.height,
                annotation.x, pdfY,
                annotation.x + annotation.width, pdfY
              ],
              F: 4, // 可打印标志
              P: page.ref,
              // 添加注释主题，区分评论和高亮
              Subj: PDFHexString.fromText('评论'),
            })
            
            // 安全地获取或创建页面注释数组
            let pageAnnots = page.node.get(PDFName.of('Annots')) as PDFArray
            if (!pageAnnots || !(pageAnnots instanceof PDFArray)) {
              pageAnnots = PDFArray.withContext(pdfDoc.context)
              page.node.set(PDFName.of('Annots'), pageAnnots)
            }
            pageAnnots.push(commentAnnotation)
          }
        })
      }
    })
    
    // 生成导出的PDF
    const pdfBytes = await pdfDoc.save()
    
    // 生成导出文件名
    const exportFilename = filename.replace(/\.pdf$/i, '_annotated.pdf')
    
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportFilename}"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ 
      error: 'Failed to export PDF', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 