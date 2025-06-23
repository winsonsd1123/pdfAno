"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Upload, FileText, CheckCircle, Clock, Trash2, Eye, Edit3, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadTime: Date
  status: "uploading" | "completed" | "error"
}

export default function HomePage() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // 页面加载时获取已上传的文件
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/files')
        if (response.ok) {
          const data = await response.json()
          const files = data.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            size: file.size,
            uploadTime: new Date(file.uploadTime),
            status: "completed" as const
          }))
          setUploadedFiles(files)
        }
      } catch (error) {
        console.error('获取文件列表失败:', error)
      }
    }
    
    fetchFiles()
  }, [])

  const handleFileUpload = async (file: File) => {
    if (file.type === "application/pdf") {
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        uploadTime: new Date(),
        status: "uploading",
      }

      setUploadedFiles((prev) => [...prev, newFile])

      try {
        const formData = new FormData()
        formData.append('files', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          setUploadedFiles((prev) => 
            prev.map((f) => (f.id === newFile.id ? { ...f, status: "completed" } : f))
          )
        } else {
          throw new Error('上传失败')
        }
      } catch (error) {
        console.error('上传错误:', error)
        setUploadedFiles((prev) => 
          prev.map((f) => (f.id === newFile.id ? { ...f, status: "error" } : f))
        )
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      await handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const deleteFile = async (id: string) => {
    try {
      // 找到要删除的文件
      const fileToDelete = uploadedFiles.find(f => f.id === id)
      if (!fileToDelete) return

      const response = await fetch(`/api/files/${encodeURIComponent(fileToDelete.name)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
      } else {
        console.error('删除文件失败')
      }
    } catch (error) {
      console.error('删除文件错误:', error)
    }
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
              <Link href="/" className="text-black font-medium">
                首页
              </Link>
              <Link href="/workspace" className="text-gray-600 hover:text-black transition-colors">
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">智能PDF文档分析</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            上传您的PDF文档，我们将为您提供智能解析和批注功能，让文档阅读更加高效
          </p>
        </div>

        {/* Upload Area */}
        <div>
          <h3 className="text-2xl font-semibold text-black mb-6">上传文档</h3>
          <Card className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                isDragOver ? "border-black bg-gray-50" : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-black mb-2">拖拽PDF文件到此处</h4>
              <p className="text-gray-600 mb-6">支持单个或多个文件上传</p>
              <Button
                className="bg-black text-white hover:bg-gray-800"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                选择文件
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  for (const file of files) {
                    await handleFileUpload(file)
                  }
                }}
              />
            </div>
          </Card>
        </div>

        {/* File List */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-black">已上传文档</h3>
            {uploadedFiles.length > 0 && (
              <Link href="/workspace">
                <Button className="bg-black text-white hover:bg-gray-800">前往工作台批注</Button>
              </Link>
            )}
          </div>
          <Card className="p-6">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无上传的文档</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploadTime.toLocaleString()}</span>
                          {file.status === "uploading" && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-yellow-500 animate-spin" />
                                <span className="text-yellow-600">上传中...</span>
                              </div>
                            </>
                          )}
                          {file.status === "completed" && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-green-600">已完成</span>
                              </div>
                            </>
                          )}
                          {file.status === "error" && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                <span className="text-red-600">上传失败</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {file.status === "completed" && (
                        <>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          <Link href={`/viewer?file=${encodeURIComponent(file.name)}`}>
                            <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                              <Edit3 className="h-4 w-4 mr-1" />
                              智能批注
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFile(file.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {file.status === "error" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // 重新上传文件
                              setUploadedFiles((prev) => 
                                prev.map((f) => (f.id === file.id ? { ...f, status: "uploading" } : f))
                              )
                              // 这里需要重新获取文件，但由于我们没有保存原始文件对象，
                              // 暂时只能删除失败的记录让用户重新上传
                              setTimeout(() => deleteFile(file.id), 100)
                            }}
                          >
                            重试
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFile(file.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-semibold text-black mb-8 text-center">功能特色</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <Upload className="h-12 w-12 text-black mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-black mb-2">快速上传</h4>
              <p className="text-gray-600">支持拖拽上传，批量处理多个PDF文档</p>
            </Card>
            <Card className="p-6 text-center">
              <FileText className="h-12 w-12 text-black mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-black mb-2">智能解析</h4>
              <p className="text-gray-600">自动识别文档结构，提取关键信息</p>
            </Card>
            <Card className="p-6 text-center">
              <FileText className="h-12 w-12 text-black mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-black mb-2">专业批注</h4>
              <p className="text-gray-600">在工作台进行专业的文档批注和协作</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-6 w-6" />
                <span className="font-bold text-lg">PDF Analyzer</span>
              </div>
              <p className="text-gray-400">智能PDF文档分析平台</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    功能介绍
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    定价方案
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API文档
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">支持</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    帮助中心
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    联系我们
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    反馈建议
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">公司</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    关于我们
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    隐私政策
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    服务条款
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PDF Analyzer. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
