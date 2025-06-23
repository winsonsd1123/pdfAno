"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"

import { useSearchParams } from "next/navigation"
import {
  FileText,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Download,
  Search,
  ArrowLeft,
  MoreVertical,
  User,
  Highlighter,
  MessageCircle,
  MousePointer,
  Loader,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"

interface Annotation {
  id: string
  page: number
  author: string
  content: string
  timestamp: Date
  x: number
  y: number
  width: number
  height: number
  selectedText: string
  type: "highlight" | "comment" | "note" | "strikeout"
}

interface ReferenceIssue {
  id: string
  type: "format" | "missing" | "invalid_doi" | "incomplete" | "duplicate"
  severity: "error" | "warning" | "info"
  page: number
  line: number
  content: string
  suggestion: string
  reference: string
}

type AnnotationTool = "select" | "highlight" | "comment" | "note" | "strikeout"
type TabType = "annotations" | "references"

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: any
  }
}

export default function ViewerPage() {
  const searchParams = useSearchParams()
  const fileName = searchParams.get("file") || "document.pdf"
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select")
  const [activeTab, setActiveTab] = useState<TabType>("annotations")
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [textLayer, setTextLayer] = useState<any>(null)
  const [isCheckingReferences, setIsCheckingReferences] = useState(false)
  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false)
  const [autoAnnotationProgress, setAutoAnnotationProgress] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)

  const [annotations, setAnnotations] = useState<Annotation[]>([
    {
      id: "1",
      page: 1,
      author: "系统分析",
      content: "检测到重要段落，建议重点关注此部分内容。",
      timestamp: new Date(),
      x: 100,
      y: 200,
      width: 200,
      height: 20,
      selectedText: "重要内容",
      type: "highlight",
    },
  ])

  const [referenceIssues, setReferenceIssues] = useState<ReferenceIssue[]>([
    {
      id: "1",
      type: "format",
      severity: "error",
      page: 5,
      line: 12,
      content: "Smith, J. (2020). Title of paper. Journal Name, 15(3), 123-145.",
      suggestion: "期刊名称应使用斜体格式",
      reference: "Smith, J. (2020). Title of paper. *Journal Name*, 15(3), 123-145.",
    },
    {
      id: "2",
      type: "missing",
      severity: "warning",
      page: 3,
      line: 8,
      content: "根据研究显示 [1]",
      suggestion: "引用 [1] 在参考文献列表中未找到",
      reference: "需要在参考文献列表中添加对应的文献",
    },
    {
      id: "3",
      type: "invalid_doi",
      severity: "error",
      page: 6,
      line: 20,
      content: "DOI: 10.1000/invalid-doi",
      suggestion: "DOI格式无效或无法访问",
      reference: "请检查DOI的正确性",
    },
    {
      id: "4",
      type: "incomplete",
      severity: "warning",
      page: 5,
      line: 15,
      content: "Johnson, A. Title of paper.",
      suggestion: "缺少发表年份和期刊信息",
      reference: "Johnson, A. (年份). Title of paper. *期刊名称*, 卷(期), 页码.",
    },
  ])

  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: number
    y: number
    width: number
    height: number
    selectedText: string
  } | null>(null)
  const [annotationContent, setAnnotationContent] = useState("")
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  // Add a ref to track current render task
  const renderTaskRef = useRef<any>(null)

  // 初始化PDF.js
  useEffect(() => {
    const initPDFJS = async () => {
      // 加载PDF.js库
      if (!window.pdfjsLib) {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
          loadPDF()
        }
        document.head.appendChild(script)
      } else {
        loadPDF()
      }
    }

    const loadPDF = async () => {
      try {
        setIsLoading(true)
        // 从URL参数获取文件名，构建服务端PDF文件的URL
        const pdfUrl = `/api/files/${encodeURIComponent(fileName)}`

        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          onProgress: (progress: any) => {
            if (progress.total > 0) {
              setLoadingProgress(Math.round((progress.loaded / progress.total) * 100))
            }
          },
        })

        const pdf = await loadingTask.promise
        setPdfDocument(pdf)
        setTotalPages(pdf.numPages)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading PDF:", error)
        setIsLoading(false)
      }
    }

    initPDFJS()
  }, [])

  // 渲染PDF页面
  useEffect(() => {
    if (pdfDocument && canvasRef.current) {
      renderPage()
    }

    // Cleanup function to cancel any ongoing render
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [pdfDocument, currentPage, zoom])

  const renderPage = async () => {
    if (!pdfDocument || !canvasRef.current) return

    // Cancel any ongoing render operation
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    try {
      const page = await pdfDocument.getPage(currentPage)
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        console.error("无法获取canvas上下文")
        return
      }

      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height)

      const viewport = page.getViewport({ scale: zoom })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }

      // Store the render task reference
      renderTaskRef.current = page.render(renderContext)

      // Wait for render to complete
      await renderTaskRef.current.promise

      // Render text layer for better text selection
      await renderTextLayer(page, viewport)

      // Clear the reference when done
      renderTaskRef.current = null
    } catch (error: any) {
      // Handle cancellation gracefully
      if (error.name === "RenderingCancelledException") {
        console.log("Render was cancelled")
      } else {
        console.error("Error rendering page:", error)
      }
      renderTaskRef.current = null
    }
  }

  const renderTextLayer = async (page: any, viewport: any) => {
    if (!textLayerRef.current) return

    try {
      const textContent = await page.getTextContent()
      setTextLayer(textContent)

      // Clear existing text layer
      textLayerRef.current.innerHTML = ""
      textLayerRef.current.style.left = "0px"
      textLayerRef.current.style.top = "0px"
      textLayerRef.current.style.right = "0px"
      textLayerRef.current.style.bottom = "0px"

      // Create text layer
      const textLayerDiv = textLayerRef.current
      textLayerDiv.style.width = viewport.width + "px"
      textLayerDiv.style.height = viewport.height + "px"

      // Add text items
      textContent.items.forEach((textItem: any, index: number) => {
        const textDiv = document.createElement("span")
        textDiv.style.position = "absolute"
        textDiv.style.whiteSpace = "pre"
        textDiv.style.color = "rgba(0,0,0,0.1)" // 稍微可见，便于调试
        textDiv.style.fontSize = Math.abs(textItem.transform[0]) + "px"
        textDiv.style.fontFamily = textItem.fontName || "sans-serif"
        textDiv.style.left = textItem.transform[4] + "px"
        textDiv.style.top = viewport.height - textItem.transform[5] - Math.abs(textItem.transform[3]) + "px"
        textDiv.textContent = textItem.str
        textDiv.setAttribute("data-text-index", index.toString())
        textDiv.style.userSelect = "text"
        textDiv.style.pointerEvents = "auto"
        textLayerDiv.appendChild(textDiv)
      })
    } catch (error) {
      console.error("Error rendering text layer:", error)
    }
  }

  const getToolIcon = (tool: AnnotationTool) => {
    switch (tool) {
      case "select":
        return MousePointer
      case "highlight":
        return Highlighter
      case "comment":
        return MessageCircle
      case "note":
        return FileText
      case "strikeout":
        return Minus
      default:
        return MousePointer
    }
  }

  const getToolName = (tool: AnnotationTool) => {
    switch (tool) {
      case "select":
        return "选择"
      case "highlight":
        return "高亮"
      case "comment":
        return "注释"
      case "note":
        return "便笺"
      case "strikeout":
        return "删除线"
      default:
        return "选择"
    }
  }

  const getCursorStyle = () => {
    switch (activeTool) {
      case "highlight":
        return "cursor-crosshair"
      case "comment":
        return "cursor-crosshair"
      case "note":
        return "cursor-crosshair"
      case "strikeout":
        return "cursor-crosshair"
      default:
        return "cursor-default"
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "select") return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsSelecting(true)
    setSelectionStart({ x, y })
    setSelectionEnd({ x, y })

    // Prevent text selection when using annotation tools
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setSelectionEnd({ x, y })
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || !selectionEnd) return

    setIsSelecting(false)

    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)

    // 只有当选择区域足够大时才创建批注
    if (width > 10 && height > 10) {
      const x = Math.min(selectionStart.x, selectionEnd.x)
      const y = Math.min(selectionStart.y, selectionEnd.y)

      // 使用改进的文本提取方法
      const selectedText = await extractTextFromPDFRegion(x, y, width, height)

      if (activeTool === "highlight") {
        // 高亮工具直接创建批注
        createAnnotation(x, y, width, height, selectedText, "高亮标记")
      } else if (activeTool === "strikeout") {
        // 删除线工具直接创建批注
        createAnnotation(x, y, width, height, selectedText, "删除标记")
      } else if (activeTool === "comment" || activeTool === "note") {
        // 注释和便笺工具需要用户输入内容
        setPendingAnnotation({
          x: x / zoom,
          y: y / zoom,
          width: width / zoom,
          height: height / zoom,
          selectedText,
        })
      }
    }

    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const extractSelectedText = async (x: number, y: number, width: number, height: number): Promise<string> => {
    if (!textLayer || !textLayerRef.current) {
      return `第${currentPage}页选中内容`
    }

    try {
      // 获取选择区域内的文本元素
      const textElements = textLayerRef.current.querySelectorAll("span")
      let selectedText = ""

      textElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (!containerRect) return

        // 计算元素相对于容器的位置
        const elementX = rect.left - containerRect.left
        const elementY = rect.top - containerRect.top
        const elementWidth = rect.width
        const elementHeight = rect.height

        // 检查文本元素是否与选择区域重叠
        const isOverlapping = !(
          elementX + elementWidth < x ||
          elementX > x + width ||
          elementY + elementHeight < y ||
          elementY > y + height
        )

        if (isOverlapping) {
          const text = element.textContent || ""
          if (text.trim()) {
            selectedText += text + " "
          }
        }
      })

      return selectedText.trim() || `第${currentPage}页选中内容`
    } catch (error) {
      console.error("Error extracting text:", error)
      return `第${currentPage}页选中内容`
    }
  }

  const extractTextFromPDFRegion = async (x: number, y: number, width: number, height: number): Promise<string> => {
    if (!pdfDocument || !textLayer) {
      return `第${currentPage}页选中内容`
    }

    try {
      const page = await pdfDocument.getPage(currentPage)
      const viewport = page.getViewport({ scale: zoom })

      // 将选择区域坐标转换为PDF坐标系统
      const pdfX = x / zoom
      const pdfY = (viewport.height - y - height) / zoom
      const pdfWidth = width / zoom
      const pdfHeight = height / zoom

      let selectedText = ""

      // 遍历文本内容，找到在选择区域内的文本
      textLayer.items.forEach((textItem: any) => {
        const itemX = textItem.transform[4]
        const itemY = textItem.transform[5]
        const itemWidth = textItem.width || 0
        const itemHeight = Math.abs(textItem.transform[3]) || 0

        // 检查文本项是否在选择区域内
        if (
          itemX >= pdfX &&
          itemX + itemWidth <= pdfX + pdfWidth &&
          itemY >= pdfY &&
          itemY + itemHeight <= pdfY + pdfHeight
        ) {
          selectedText += textItem.str + " "
        }
      })

      return selectedText.trim() || `第${currentPage}页选中内容`
    } catch (error) {
      console.error("Error extracting text from PDF region:", error)
      return `第${currentPage}页选中内容`
    }
  }

  const createAnnotation = (
    x: number,
    y: number,
    width: number,
    height: number,
    selectedText: string,
    content: string,
  ) => {
    const annotation: Annotation = {
      id: Date.now().toString(),
      page: currentPage,
      author: "用户",
      content,
      timestamp: new Date(),
      x: x / zoom, // 存储相对于1.0缩放的坐标
      y: y / zoom,
      width: width / zoom,
      height: height / zoom,
      selectedText,
      type: activeTool as Annotation["type"],
    }
    setAnnotations((prev) => [...prev, annotation])
  }

  const handleAddAnnotation = () => {
    if (pendingAnnotation && annotationContent.trim()) {
      createAnnotation(
        pendingAnnotation.x * zoom, // 转换回当前缩放的坐标
        pendingAnnotation.y * zoom,
        pendingAnnotation.width * zoom,
        pendingAnnotation.height * zoom,
        pendingAnnotation.selectedText,
        annotationContent,
      )
      setPendingAnnotation(null)
      setAnnotationContent("")
    }
  }

  const cancelAnnotation = () => {
    setPendingAnnotation(null)
    setAnnotationContent("")
  }

  const getSelectionRect = () => {
    if (!selectionStart || !selectionEnd) return null

    const x = Math.min(selectionStart.x, selectionEnd.x)
    const y = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)

    return { x, y, width, height }
  }

  const getAnnotationColor = (type: Annotation["type"]) => {
    switch (type) {
      case "highlight":
        return "bg-yellow-200 border-yellow-400"
      case "comment":
        return "bg-blue-200 border-blue-400"
      case "note":
        return "bg-orange-200 border-orange-400"
      case "strikeout":
        return "bg-red-200 border-red-400"
      default:
        return "bg-gray-200 border-gray-400"
    }
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3.0))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const currentPageAnnotations = annotations.filter((ann) => ann.page === currentPage)
  const selectionRect = getSelectionRect()

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation.id)
    setEditContent(annotation.content)
  }

  const handleCancelEdit = () => {
    setEditingAnnotation(null)
    setEditContent("")
  }

  const handleDeleteAnnotation = (annotationId: string) => {
    if (confirm("确定要删除这个批注吗？")) {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId))
      // 如果删除的是正在编辑的批注，取消编辑状态
      if (editingAnnotation === annotationId) {
        setEditingAnnotation(null)
        setEditContent("")
      }
    }
  }

  const handleSaveEdit = (annotationId: string) => {
    if (editContent.trim()) {
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId ? { ...ann, content: editContent.trim(), timestamp: new Date() } : ann,
        ),
      )
    }
    setEditingAnnotation(null)
    setEditContent("")
  }

  // Handle text selection for highlight tool
  const handleTextSelection = () => {
    if (activeTool !== "highlight") return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = selection.toString().trim()

    if (selectedText && containerRef.current) {
      const rect = range.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()

      const x = rect.left - containerRect.left
      const y = rect.top - containerRect.top
      const width = rect.width
      const height = rect.height

      createAnnotation(x, y, width, height, selectedText, "高亮标记")
      selection.removeAllRanges()
    }
  }

  const getSeverityIcon = (severity: ReferenceIssue["severity"]) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: ReferenceIssue["severity"]) => {
    switch (severity) {
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "info":
        return "border-blue-200 bg-blue-50"
    }
  }

  const getIssueTypeText = (type: ReferenceIssue["type"]) => {
    switch (type) {
      case "format":
        return "格式错误"
      case "missing":
        return "引用缺失"
      case "invalid_doi":
        return "DOI无效"
      case "incomplete":
        return "信息不完整"
      case "duplicate":
        return "重复引用"
      default:
        return "未知问题"
    }
  }

  const handleCheckReferences = async () => {
    setIsCheckingReferences(true)
    // 模拟文献检查过程
    setTimeout(() => {
      setIsCheckingReferences(false)
      // 这里可以添加实际的文献检查逻辑
    }, 3000)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  // 存储文档的文本位置信息
  const [documentTextMap, setDocumentTextMap] = useState<Map<number, any[]>>(new Map())

  // 提取PDF文档全文内容并记录位置信息
  const extractFullDocumentText = async (): Promise<string> => {
    if (!pdfDocument) return ''
    
    let fullText = ''
    const textMap = new Map<number, any[]>()
    
    try {
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        const viewport = page.getViewport({ scale: 1.0 })
        
        // 存储每页的文本项位置信息
        const pageTextItems = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5], // 转换坐标系
          width: item.width || 0,
          height: Math.abs(item.transform[3]) || 12,
          fontName: item.fontName || '',
          fontSize: Math.abs(item.transform[0]) || 12
        }))
        
        textMap.set(pageNum, pageTextItems)
        
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += `\n\n=== 第${pageNum}页 ===\n${pageText}`
      }
      
      setDocumentTextMap(textMap)
    } catch (error) {
      console.error('提取文档文本失败:', error)
    }
    
    return fullText
  }

  // 根据文本内容查找在PDF中的位置并计算合适的覆盖区域
  const findTextPosition = (pageNum: number, searchText: string): { x: number; y: number; width: number; height: number } | null => {
    const pageTextItems = documentTextMap.get(pageNum)
    if (!pageTextItems || !searchText.trim()) {
      return null
    }

    // 清理搜索文本
    const cleanSearchText = searchText.trim().toLowerCase()
    
    // 尝试精确匹配并计算覆盖区域
    let matchedItems: any[] = []
    
    // 首先收集所有匹配的文本项
    for (const item of pageTextItems) {
      if (item.text.toLowerCase().includes(cleanSearchText)) {
        matchedItems.push(item)
      }
    }
    
    // 如果精确匹配失败，尝试关键词匹配
    if (matchedItems.length === 0) {
      const keywords = cleanSearchText.split(/\s+/).filter(word => word.length > 2)
      for (const keyword of keywords) {
        for (const item of pageTextItems) {
          if (item.text.toLowerCase().includes(keyword)) {
            matchedItems.push(item)
            break // 找到一个关键词匹配就够了
          }
        }
        if (matchedItems.length > 0) break
      }
    }
    
    if (matchedItems.length > 0) {
      // 计算所有匹配文本的边界框
      const minX = Math.min(...matchedItems.map(item => item.x))
      const maxX = Math.max(...matchedItems.map(item => item.x + item.width))
      const minY = Math.min(...matchedItems.map(item => item.y))
      const maxY = Math.max(...matchedItems.map(item => item.y + item.height))
      
      // 计算覆盖区域，添加一些边距
      const padding = 10
      const calculatedWidth = maxX - minX + padding * 2
      const calculatedHeight = maxY - minY + padding * 2
      
      return {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.max(calculatedWidth, 120), // 最小宽度120px
        height: Math.max(calculatedHeight, 30) // 最小高度30px
      }
    }

    // 如果还是找不到，尝试查找相似的文本段落
    const searchWords = cleanSearchText.split(/\s+/).filter(word => word.length > 1)
    if (searchWords.length > 0) {
      for (const word of searchWords) {
        const similarItems = pageTextItems.filter(item => 
          item.text.toLowerCase().includes(word.toLowerCase())
        )
        
        if (similarItems.length > 0) {
          // 找到相似文本，计算一个较大的区域
          const item = similarItems[0]
          const estimatedWidth = Math.max(item.width * 3, 150) // 估算宽度
          const estimatedHeight = Math.max(item.height * 2, 40) // 估算高度
          
          return {
            x: item.x,
            y: item.y,
            width: estimatedWidth,
            height: estimatedHeight
          }
        }
      }
    }

    // 如果都找不到，返回页面默认位置
    return {
      x: 50,
      y: 100,
      width: 200,
      height: 60
    }
  }

  // 处理PDF导出
  const handleExportPDF = async (useEnhanced: boolean = false) => {
    try {
      setIsExporting(true)
      
      // 准备导出数据
      const exportData = {
        filename: fileName,
        annotations: annotations.map(annotation => ({
          ...annotation,
          timestamp: annotation.timestamp.toISOString() // 转换为字符串格式
        }))
      }

      // 选择使用标准或增强导出API
      const apiEndpoint = useEnhanced ? '/api/export-enhanced' : '/api/export'
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导出失败')
      }

      // 获取导出的PDF文件
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      const suffix = useEnhanced ? '_enhanced_annotated.pdf' : '_annotated.pdf'
      link.download = fileName.replace('.pdf', suffix)
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('导出失败:', error)
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // 处理自动批注
  const handleAutoAnnotation = async () => {
    try {
      setIsAutoAnnotating(true)
      setAutoAnnotationProgress(10)

      // 提取文档内容
      setAutoAnnotationProgress(30)
      const documentContent = await extractFullDocumentText()
      
      if (!documentContent.trim()) {
        throw new Error('无法提取文档内容')
      }

      setAutoAnnotationProgress(50)

      // 调用分析API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent,
          fileName
        })
      })

      setAutoAnnotationProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '分析请求失败')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '分析失败')
      }

      // 将分析结果转换为批注，智能定位位置
      const newAnnotations: Annotation[] = result.analysis.map((item: any, index: number) => {
        const pageNum = item.page || 1
        
        // 尝试根据选中文本找到精确位置
        let position = findTextPosition(pageNum, item.selectedText || item.title)
        
        // 如果找不到精确位置，尝试根据标题查找
        if (!position || (position.x === 50 && position.y === 100)) {
          position = findTextPosition(pageNum, item.title)
        }
        
                 // 如果还是找不到，使用智能分布算法
         if (!position || (position.x === 50 && position.y === 100)) {
           const pageTextItems = documentTextMap.get(pageNum) || []
           if (pageTextItems.length > 0) {
             // 根据页面内容分布智能选择位置
             const sectionIndex = index % 4 // 分为4个区域
             const pageHeight = Math.max(...pageTextItems.map(item => item.y + item.height)) || 800
             const pageWidth = Math.max(...pageTextItems.map(item => item.x + item.width)) || 600
             const sectionHeight = pageHeight / 4
             
             // 计算更合理的覆盖区域
             const baseWidth = Math.min(pageWidth * 0.3, 250) // 页面宽度的30%，最大250px
             const baseHeight = Math.min(sectionHeight * 0.6, 80) // 区域高度的60%，最大80px
             
             position = {
               x: 50 + (sectionIndex % 2) * (pageWidth * 0.4), // 左右两列，间距为页面宽度的40%
               y: 100 + Math.floor(sectionIndex / 2) * sectionHeight,
               width: baseWidth,
               height: baseHeight
             }
           } else {
             // 默认分布，使用更大的覆盖区域
             position = {
               x: 50 + (index % 3) * 150,
               y: 100 + Math.floor(index / 3) * 100,
               width: 220, // 增加默认宽度
               height: 80  // 增加默认高度
             }
           }
         }

        return {
          id: `auto-${Date.now()}-${index}`,
          page: pageNum,
          author: "指导教师",
          content: `${item.title}\r\n\n${item.description}\r\n\n 修改建议：\n${item.suggestion}`,
          timestamp: new Date(),
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          selectedText: item.selectedText || `${item.type}相关内容`,
          type: "comment" as const,
        }
      })

      setAnnotations(prev => [...prev, ...newAnnotations])
      setAutoAnnotationProgress(100)

      // 延迟关闭进度对话框
      setTimeout(() => {
        setIsAutoAnnotating(false)
        setAutoAnnotationProgress(0)
      }, 500)

    } catch (error) {
      console.error('自动批注失败:', error)
      alert(`自动批注失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsAutoAnnotating(false)
      setAutoAnnotationProgress(0)
    }
  }

  const referenceStats = {
    total: referenceIssues.length,
    errors: referenceIssues.filter((issue) => issue.severity === "error").length,
    warnings: referenceIssues.filter((issue) => issue.severity === "warning").length,
    info: referenceIssues.filter((issue) => issue.severity === "info").length,
  }

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-black animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-black mb-2">加载PDF文档中...</h3>
          <p className="text-gray-600 mb-4">正在解析文档内容</p>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{loadingProgress}%</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/workspace">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回工作台
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-black" />
                <h1 className="text-lg font-semibold text-black">PDF Analyzer</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={annotations.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    导出PDF
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>导出带批注的PDF</AlertDialogTitle>
                    <AlertDialogDescription>
                      将当前所有批注（高亮和注释）整合到原始PDF中并导出。
                      <br />
                      <br />
                      <strong>当前批注数量：{annotations.length}</strong>
                      <br />
                      • 高亮批注：{annotations.filter(a => a.type === 'highlight').length} 个
                      <br />
                      • 注释批注：{annotations.filter(a => a.type === 'comment').length} 个
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleExportPDF(false)}
                      disabled={isExporting}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      {isExporting ? '导出中...' : '标准导出'}
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={() => handleExportPDF(true)}
                      disabled={isExporting}
                      className="bg-blue-600 text-white hover:bg-blue-700 ml-2"
                    >
                      {isExporting ? '导出中...' : '增强导出'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Combined Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Left section: File name and annotation tools */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">{fileName}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  第 {currentPage}/{totalPages} 页
                </span>
              </div>
              
              <div className="h-4 w-px bg-gray-300" /> {/* Divider */}
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">批注工具：</span>
                {(["select", "highlight", "comment"] as AnnotationTool[]).map((tool) => {
                  const Icon = getToolIcon(tool)
                  return (
                    <Button
                      key={tool}
                      variant={activeTool === tool ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTool(tool)}
                      className={activeTool === tool ? "bg-black text-white" : ""}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {getToolName(tool)}
                    </Button>
                  )
                })}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      自动批注
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认自动批注</AlertDialogTitle>
                      <AlertDialogDescription>
                        确认要对当前PDF文档进行自动批注吗？系统将自动分析文档内容并添加相关批注。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAutoAnnotation}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        确认
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {activeTool === "highlight" && (
                  <span className="text-xs text-gray-500 ml-2">选择文字后自动高亮</span>
                )}
              </div>
            </div>

            {/* Right section: Page navigation and zoom controls */}
            <div className="flex items-center space-x-4">
              {/* Page Navigation */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
                  上一页
                </Button>
                <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
                  下一页
                </Button>
              </div>
              
              <div className="h-4 w-px bg-gray-300" /> {/* Divider */}
              
              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-144px)]">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-50 p-8 overflow-auto">
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className={`relative bg-white shadow-lg ${getCursorStyle()}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseUpCapture={handleTextSelection}
            >
              <canvas ref={canvasRef} className="block" style={{ maxWidth: "100%", height: "auto" }} />

              {/* Text Layer for better text selection */}
              <div
                ref={textLayerRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  pointerEvents: activeTool === "highlight" ? "auto" : "none",
                }}
              />

              {/* Existing Annotations */}
              {currentPageAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`absolute border-2 cursor-pointer transition-all duration-200 hover:opacity-80 ${getAnnotationColor(annotation.type)}`}
                  style={{
                    left: `${annotation.x * zoom}px`,
                    top: `${annotation.y * zoom}px`,
                    width: `${annotation.width * zoom}px`,
                    height: `${annotation.height * zoom}px`,
                    opacity: annotation.author === "指导教师" ? 0.4 : 0.6, // AI批注稍微透明一些
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  title={`${annotation.selectedText}: ${annotation.content}`}
                  onClick={() => {
                    // 点击批注框时，在右侧面板高亮显示对应批注
                    const annotationElement = document.querySelector(`[data-annotation-id="${annotation.id}"]`)
                    if (annotationElement) {
                      annotationElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                >
                  {/* 添加一个小标签显示批注类型 */}
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-xs flex items-center justify-center"
                    style={{ fontSize: '8px' }}
                  >
                    {annotation.author === "指导教师" ? "师" : annotation.author === "系统分析" ? "AI" : "用"}
                  </div>
                </div>
              ))}

              {/* Current Selection */}
              {isSelecting && selectionRect && (
                <div
                  className={`absolute border-2 border-dashed opacity-50 ${
                    activeTool === "highlight" ? "border-yellow-500 bg-yellow-100" : "border-blue-500 bg-blue-100"
                  }`}
                  style={{
                    left: `${selectionRect.x}px`,
                    top: `${selectionRect.y}px`,
                    width: `${selectionRect.width}px`,
                    height: `${selectionRect.height}px`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel with Tabs */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("annotations")}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "annotations"
                    ? "border-black text-black bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>批注</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {currentPageAnnotations.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("references")}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "references"
                    ? "border-black text-black bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>文献检查</span>
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                    {referenceStats.errors}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === "annotations" && (
              <div className="p-4 space-y-4">
                {/* Page Navigation */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">第 {currentPage} 页</span>
                    <span className="text-xs text-blue-700">{currentPageAnnotations.length} 条批注</span>
                  </div>
                </div>

                {/* Pending Annotation Form */}
                {pendingAnnotation && (
                  <Card className="p-3 border-2 border-blue-200">
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">选中文字：</span>
                      <p className="text-sm font-medium text-gray-700">"{pendingAnnotation.selectedText}"</p>
                    </div>
                    <textarea
                      value={annotationContent}
                      onChange={(e) => setAnnotationContent(e.target.value)}
                      placeholder="添加您的注释..."
                      className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button size="sm" variant="ghost" onClick={cancelAnnotation}>
                        取消
                      </Button>
                      <Button size="sm" onClick={handleAddAnnotation} className="bg-black text-white hover:bg-gray-800">
                        添加
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Annotations List */}
                {currentPageAnnotations.map((annotation) => (
                  <Card key={annotation.id} className="p-3 border border-gray-200" data-annotation-id={annotation.id}>
                    <div className="flex items-start space-x-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${getAnnotationColor(annotation.type)}`}
                      >
                        {annotation.author === "指导教师" ? (
                          <span className="text-xs font-medium text-gray-600">师</span>
                        ) : annotation.author === "系统分析" ? (
                          <span className="text-xs font-medium text-gray-600">AI</span>
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{annotation.author}</span>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                const menu = e.currentTarget.nextElementSibling as HTMLElement
                                menu.classList.toggle("hidden")
                              }}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleDeleteAnnotation(annotation.id)
                                    const menu = document.querySelector(".absolute.right-0.top-6") as HTMLElement
                                    menu?.classList.add("hidden")
                                  }}
                                  className="block w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {annotation.selectedText && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500">选中文字：</span>
                            <p className="text-xs text-gray-600 italic">"{annotation.selectedText}"</p>
                          </div>
                        )}

                        {editingAnnotation === annotation.id ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onBlur={() => handleSaveEdit(annotation.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.ctrlKey) {
                                handleSaveEdit(annotation.id)
                              }
                              if (e.key === "Escape") {
                                handleCancelEdit()
                              }
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <p
                            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => handleEditAnnotation(annotation)}
                            title="点击编辑批注内容"
                          >
                            {annotation.content}
                          </p>
                        )}

                        <div className="mt-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getAnnotationColor(annotation.type)} text-gray-700`}
                          >
                            {getToolName(annotation.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {currentPageAnnotations.length === 0 && !pendingAnnotation && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">当前页面暂无批注</p>
                    <p className="text-sm text-gray-400">选择批注工具，然后在PDF上选择文字或区域来添加批注</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "references" && (
              <div className="p-4 space-y-4">
                {/* Reference Check Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">文献检查</h3>
                  <Button
                    size="sm"
                    onClick={handleCheckReferences}
                    disabled={isCheckingReferences}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isCheckingReferences ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        检查中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        重新检查
                      </>
                    )}
                  </Button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">错误</p>
                        <p className="text-lg font-semibold text-red-600">{referenceStats.errors}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">警告</p>
                        <p className="text-lg font-semibold text-yellow-600">{referenceStats.warnings}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Issues List */}
                <div className="space-y-3">
                  {referenceIssues.map((issue) => (
                    <Card key={issue.id} className={`p-3 border ${getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start space-x-2">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{getIssueTypeText(issue.type)}</span>
                            <button
                              onClick={() => goToPage(issue.page)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              第{issue.page}页
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </button>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">问题内容：</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border">{issue.content}</p>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">建议修改：</p>
                            <p className="text-sm text-gray-700">{issue.suggestion}</p>
                          </div>
                          {issue.reference && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">参考格式：</p>
                              <p className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                {issue.reference}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {referenceIssues.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">文献格式检查完成</p>
                    <p className="text-sm text-gray-400">未发现格式问题</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 自动批注进度对话框 */}
      <Dialog open={isAutoAnnotating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>正在进行自动批注</span>
            </DialogTitle>
            <DialogDescription>
              AI正在分析您的文档，请稍候...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>分析进度</span>
                <span>{autoAnnotationProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${autoAnnotationProgress}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {autoAnnotationProgress < 30 && "正在提取文档内容..."}
              {autoAnnotationProgress >= 30 && autoAnnotationProgress < 50 && "正在准备分析..."}
              {autoAnnotationProgress >= 50 && autoAnnotationProgress < 80 && "AI正在分析文档..."}
              {autoAnnotationProgress >= 80 && autoAnnotationProgress < 100 && "正在生成批注..."}
              {autoAnnotationProgress >= 100 && "分析完成！"}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
