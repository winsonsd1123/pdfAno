import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFNumber, PDFRef, rgb, StandardFonts } from 'pdf-lib'
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
  type: "highlight" | "comment" | "note" | "strikeout"
}

// 创建PDF注释的工具函数
function createPDFAnnotation(
  pdfDoc: PDFDocument,
  page: any,
  annotation: Annotation,
  pdfY: number
): any {
  const timestamp = new Date(annotation.timestamp).toISOString().replace(/[-:T]/g, '').substring(0, 14) + 'Z'
  
  switch (annotation.type) {
    case 'highlight':
      return pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Highlight',
        Rect: [annotation.x, pdfY, annotation.x + annotation.width, pdfY + annotation.height],
        Contents: PDFHexString.fromText(annotation.content || ''),
        T: PDFHexString.fromText(annotation.author || ''),
        M: `D:${timestamp}`,
        C: [1, 1, 0], // 黄色
        CA: 0.5,
        QuadPoints: [
          annotation.x, pdfY + annotation.height,
          annotation.x + annotation.width, pdfY + annotation.height,
          annotation.x, pdfY,
          annotation.x + annotation.width, pdfY
        ],
        F: 4,
        P: page.ref,
        // 添加自定义属性以支持更好的显示
        RC: PDFHexString.fromText(`<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><p>${annotation.content}</p></body>`),
        Subj: PDFHexString.fromText('高亮'),
      })

    case 'comment':
      // 创建带背景色的高亮注释（浅蓝色背景，包含完整注释信息）
      return pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Highlight',
        Rect: [annotation.x, pdfY, annotation.x + annotation.width, pdfY + annotation.height],
        Contents: PDFHexString.fromText(annotation.content || ''),
        T: PDFHexString.fromText(annotation.author || ''),
        M: `D:${timestamp}`,
        C: [0.8, 0.9, 1], // 浅蓝色背景
        CA: 0.3, // 较低的透明度，让文字更明显
        QuadPoints: [
          annotation.x, pdfY + annotation.height,
          annotation.x + annotation.width, pdfY + annotation.height,
          annotation.x, pdfY,
          annotation.x + annotation.width, pdfY
        ],
        F: 4,
        P: page.ref,
        Subj: PDFHexString.fromText('评论'),
        RC: PDFHexString.fromText(`<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><p>${annotation.content}</p></body>`),
      })

    case 'note':
      return pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Text',
        Rect: [annotation.x, pdfY, annotation.x + 24, pdfY + 24],
        Contents: PDFHexString.fromText(annotation.content || ''),
        T: PDFHexString.fromText(annotation.author || ''),
        M: `D:${timestamp}`,
        Name: 'Note',
        Open: false,
        F: 4,
        C: [1, 0.8, 0],
        P: page.ref,
        Subj: PDFHexString.fromText('便笺'),
        RC: PDFHexString.fromText(`<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><p>${annotation.content}</p></body>`),
      })

    case 'strikeout':
      return pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'StrikeOut',
        Rect: [annotation.x, pdfY, annotation.x + annotation.width, pdfY + annotation.height],
        Contents: PDFHexString.fromText(annotation.content || ''),
        T: PDFHexString.fromText(annotation.author || ''),
        M: `D:${timestamp}`,
        C: [1, 0, 0], // 红色
        QuadPoints: [
          annotation.x, pdfY + annotation.height,
          annotation.x + annotation.width, pdfY + annotation.height,
          annotation.x, pdfY,
          annotation.x + annotation.width, pdfY
        ],
        F: 4,
        P: page.ref,
        Subj: PDFHexString.fromText('删除线'),
      })

    default:
      return null
  }
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

    // 嵌入中文字体
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
    
    // 为每个页面添加注释
    Object.keys(annotationsByPage).forEach((pageNum) => {
      const pageIndex = parseInt(pageNum) - 1
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex]
        const pageHeight = page.getHeight()
        const pageAnnotations = annotationsByPage[pageNum]
        
                 // 安全地获取或创建页面注释数组
         let pageAnnots = page.node.get(PDFName.of('Annots')) as PDFArray
         if (!pageAnnots || !(pageAnnots instanceof PDFArray)) {
           pageAnnots = PDFArray.withContext(pdfDoc.context)
           page.node.set(PDFName.of('Annots'), pageAnnots)
         }
         
         pageAnnotations.forEach((annotation: Annotation) => {
           // 转换坐标系统（PDF坐标系从左下角开始）
           const pdfY = pageHeight - annotation.y - annotation.height
           
           // 创建注释对象
           const annotationObj = createPDFAnnotation(pdfDoc, page, annotation, pdfY)
           
           if (annotationObj) {
             // 将注释添加到页面
             pageAnnots.push(annotationObj)
           }
         })
      }
    })
    
    // 添加文档级别的元数据
    pdfDoc.setTitle(`${filename} - 带注释版本`)
    pdfDoc.setSubject('包含用户注释的PDF文档')
    pdfDoc.setKeywords(['注释', '批注', 'PDF', '中文'])
    pdfDoc.setProducer('PDF注释导出工具')
    pdfDoc.setCreator('NextJS PDF Annotation System')
    pdfDoc.setCreationDate(new Date())
    pdfDoc.setModificationDate(new Date())
    
    // 生成导出的PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false, // 确保注释兼容性
      addDefaultPage: false,
    })
    
    // 生成导出文件名
    const exportFilename = filename.replace(/\.pdf$/i, '_enhanced_annotated.pdf')
    
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportFilename}"`,
        'X-Annotation-Count': annotations.length.toString(),
      },
    })

  } catch (error) {
    console.error('Enhanced export error:', error)
    return NextResponse.json({ 
      error: 'Failed to export enhanced PDF', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 