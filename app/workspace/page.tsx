"use client"

import { useState } from "react"
import { FileText, User, Clock, CheckCircle, PlayCircle, AlertCircle, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface WorkspaceDocument {
  id: string
  name: string
  uploader: string
  uploadTime: Date
  annotationStatus: "not_started" | "in_progress" | "completed"
  size: number
}

export default function WorkspacePage() {
  const [documents] = useState<WorkspaceDocument[]>([
    {
      id: "1",
      name: "产品需求文档.pdf",
      uploader: "张三",
      uploadTime: new Date("2024-01-15 10:30:00"),
      annotationStatus: "completed",
      size: 2048000,
    },
    {
      id: "2",
      name: "技术方案设计.pdf",
      uploader: "李四",
      uploadTime: new Date("2024-01-14 14:20:00"),
      annotationStatus: "in_progress",
      size: 1536000,
    },
    {
      id: "3",
      name: "用户研究报告.pdf",
      uploader: "王五",
      uploadTime: new Date("2024-01-13 09:15:00"),
      annotationStatus: "not_started",
      size: 3072000,
    },
    {
      id: "4",
      name: "竞品分析文档.pdf",
      uploader: "赵六",
      uploadTime: new Date("2024-01-12 16:45:00"),
      annotationStatus: "in_progress",
      size: 1024000,
    },
  ])

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
                          <div className="text-sm font-medium text-gray-900">{document.name}</div>
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
                      <Link href={`/viewer?file=${encodeURIComponent(document.name)}`}>
                        <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                          <Edit3 className="h-4 w-4 mr-1" />
                          批注
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
