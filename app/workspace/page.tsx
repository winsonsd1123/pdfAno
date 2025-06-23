"use client"

import { useState, useEffect } from "react"
import { FileText, User, Clock, CheckCircle, PlayCircle, AlertCircle, Edit3, Trash2 } from "lucide-react"
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
import Link from "next/link"

interface WorkspaceDocument {
  id: string
  name: string
  originalName?: string
  uploader: string
  uploadTime: Date
  annotationStatus: "not_started" | "in_progress" | "completed"
  size: number
}

export default function WorkspacePage() {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 页面加载时获取已上传的文件
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/files')
        if (response.ok) {
          const data = await response.json()
          const files = data.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            originalName: file.originalName,
            uploader: "用户", // 暂时使用默认用户，后续可以扩展用户系统
            uploadTime: new Date(file.uploadTime),
            annotationStatus: "not_started" as const, // 暂时设为未开始，后续可以从本地存储或API获取状态
            size: file.size
          }))
          setDocuments(files)
        }
      } catch (error) {
        console.error('获取文件列表失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFiles()
  }, [])

  const getStatusIcon = (status: WorkspaceDocument["annotationStatus"]) => {
    switch (status) {
      case "not_started":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      case "in_progress":
        return <PlayCircle className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusText = (status: WorkspaceDocument["annotationStatus"]) => {
    switch (status) {
      case "not_started":
        return "未开始"
      case "in_progress":
        return "批注中"
      case "completed":
        return "已完成"
    }
  }

  const getStatusColor = (status: WorkspaceDocument["annotationStatus"]) => {
    switch (status) {
      case "not_started":
        return "text-gray-600 bg-gray-100"
      case "in_progress":
        return "text-blue-600 bg-blue-100"
      case "completed":
        return "text-green-600 bg-green-100"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDeleteFile = async (document: WorkspaceDocument) => {
    try {
      // 使用实际的文件名（name字段）进行删除
      const response = await fetch(`/api/files/${encodeURIComponent(document.name)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 更新本地状态，从文档列表中移除被删除的文档
        setDocuments((prev) => prev.filter((doc) => doc.id !== document.id))
      } else {
        console.error('删除文件失败')
        alert('删除文件失败，请重试')
      }
    } catch (error) {
      console.error('删除文件错误:', error)
      alert('删除文件时发生错误，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">加载文档列表中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-black" />
              <h1 className="text-2xl font-bold text-black">PDF Analyzer</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-black transition-colors">
                首页
              </Link>
              <Link href="/workspace" className="text-black font-medium">
                工作台
              </Link>
              <a href="#" className="text-gray-600 hover:text-black transition-colors">
                功能
              </a>
              <a href="#" className="text-gray-600 hover:text-black transition-colors">
                定价
              </a>
              <a href="#" className="text-gray-600 hover:text-black transition-colors">
                帮助
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-2">批注工作台</h2>
          <p className="text-gray-600">管理和批注您的PDF文档</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总文档</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-gray-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">未开始</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter((d) => d.annotationStatus === "not_started").length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <PlayCircle className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">批注中</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter((d) => d.annotationStatus === "in_progress").length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter((d) => d.annotationStatus === "completed").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Documents Table */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-black">文档列表</h3>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无上传的文档</p>
              <Link href="/">
                <Button className="bg-black text-white hover:bg-gray-800">
                  前往上传文档
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文档名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      上传人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      上传时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件大小
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      批注状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-red-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.originalName || document.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{document.uploader}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{document.uploadTime.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(document.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            document.annotationStatus,
                          )}`}
                        >
                          {getStatusIcon(document.annotationStatus)}
                          <span className="ml-1">{getStatusText(document.annotationStatus)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link href={`/viewer?file=${encodeURIComponent(document.name)}`}>
                            <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                              <Edit3 className="h-4 w-4 mr-1" />
                              批注
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除文档</AlertDialogTitle>
                                <AlertDialogDescription>
                                  您确定要删除文档 "{document.originalName || document.name}" 吗？
                                  <br />
                                  <br />
                                  <strong className="text-red-600">此操作无法撤销，文档将被永久删除。</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFile(document)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  确认删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
