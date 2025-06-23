import { NextRequest, NextResponse } from 'next/server'
import { API_CONFIG, DEEPSEEK_PROMPTS } from '@/lib/config'

// 解析自定义格式的批注内容
function parseCustomFormat(content: string) {
  const annotations = []
  
  // 按 ---ANNOTATION--- 分割内容
  const sections = content.split('---ANNOTATION---').filter(section => section.trim())
  
  for (const section of sections) {
    try {
      const annotation: any = {}
      const lines = section.trim().split('\n')
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        if (trimmedLine.startsWith('TYPE:')) {
          annotation.type = trimmedLine.replace('TYPE:', '').trim()
        } else if (trimmedLine.startsWith('SEVERITY:')) {
          annotation.severity = trimmedLine.replace('SEVERITY:', '').trim()
        } else if (trimmedLine.startsWith('PAGE:')) {
          annotation.page = parseInt(trimmedLine.replace('PAGE:', '').trim()) || 1
        } else if (trimmedLine.startsWith('TITLE:')) {
          annotation.title = trimmedLine.replace('TITLE:', '').trim()
        } else if (trimmedLine.startsWith('DESCRIPTION:')) {
          annotation.description = trimmedLine.replace('DESCRIPTION:', '').trim()
        } else if (trimmedLine.startsWith('SUGGESTION:')) {
          annotation.suggestion = trimmedLine.replace('SUGGESTION:', '').trim()
        } else if (trimmedLine.startsWith('SELECTED:')) {
          annotation.selectedText = trimmedLine.replace('SELECTED:', '').trim()
        }
      }
      
      // 只有包含必要字段的才添加到结果中
      if (annotation.title && annotation.description) {
        annotations.push({
          type: annotation.type || 'content',
          severity: annotation.severity || 'medium',
          page: annotation.page || 1,
          title: annotation.title,
          description: annotation.description,
          suggestion: annotation.suggestion || '请参考相关规范进行修改',
          selectedText: annotation.selectedText || '相关内容'
        })
      }
    } catch (error) {
      console.error('解析单个批注失败:', error)
      continue
    }
  }
  
  return annotations
}

export async function POST(request: NextRequest) {
  try {
    const { documentContent, fileName } = await request.json()

    if (!documentContent) {
      return NextResponse.json({ error: '文档内容不能为空' }, { status: 400 })
    }

    // 检查API配置
    if (!API_CONFIG.DEEPSEEK.API_KEY) {
      return NextResponse.json({ error: 'DeepSeek API Key未配置' }, { status: 500 })
    }

    // 调用DeepSeek API
    const response = await fetch(`${API_CONFIG.DEEPSEEK.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.DEEPSEEK.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: API_CONFIG.DEEPSEEK.MODEL,
        messages: [
          {
            role: 'system',
            content: DEEPSEEK_PROMPTS.DOCUMENT_ANALYSIS
          },
          {
            role: 'user',
            content: `请分析以下PDF文档内容：\n\n文档名称：${fileName}\n\n文档内容：\n${documentContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('DeepSeek API错误:', errorData)
      return NextResponse.json({ 
        error: `DeepSeek API调用失败: ${response.status} ${response.statusText}` 
      }, { status: 500 })
    }

    const data = await response.json()
    
    // 解析自定义格式的返回内容
    let analysisResult
    try {
      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('API返回内容为空')
      }
      
      console.log('原始返回内容:', content)
      
      // 解析自定义格式
      const annotations = parseCustomFormat(content)
      analysisResult = { analysis: annotations }
      
    } catch (parseError) {
      console.error('解析DeepSeek返回内容失败:', parseError)
      console.error('原始内容:', data.choices?.[0]?.message?.content)
      return NextResponse.json({ 
        error: '解析AI分析结果失败，请检查API配置或重试' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult.analysis || [],
      usage: data.usage
    })

  } catch (error) {
    console.error('文档分析错误:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '文档分析失败' 
    }, { status: 500 })
  }
} 