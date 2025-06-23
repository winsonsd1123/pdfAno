# PDF注释导出功能使用指南

## 功能概述

本项目现在支持两种PDF注释导出方式：

1. **标准PDF注释导出** (`/api/export`) - 使用pdf-lib创建真正的PDF注释
2. **增强PDF注释导出** (`/api/export-enhanced`) - 支持更多注释类型和更好的中文处理

## 主要特性

### ✅ 已实现的功能

- **真正的PDF注释**: 导出的注释可以在PDF阅读器的注释面板中显示
- **中文支持**: 完全支持中文作者名和注释内容
- **多种注释类型**: 支持高亮、评论、便笺、删除线等
- **时间戳记录**: 保留注释的创建时间
- **作者信息**: 记录注释的创建者
- **坐标精确**: 准确保持注释在页面中的位置

### 🔧 技术实现

#### 核心技术栈
- `pdf-lib`: 用于PDF操作和注释创建
- `@pdf-lib/fontkit`: 支持中文字体嵌入
- `Next.js API Routes`: 后端API实现

#### 注释类型支持

1. **高亮注释 (Highlight)**
   - 黄色高亮显示
   - 支持QuadPoints精确定位
   - 透明度可调

2. **评论注释 (Comment)**
   - 黄色图标显示
   - 点击显示评论内容
   - 支持富文本内容

3. **便笺注释 (Note)**
   - 橙色图标显示
   - 适合添加备注信息

4. **删除线注释 (StrikeOut)**
   - 红色删除线显示
   - 用于标记删除内容

## 使用方法

### 1. 基础导出 (推荐)

```typescript
// 发送请求到 /api/export
const response = await fetch('/api/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filename: 'example.pdf',
    annotations: [
      {
        id: "1",
        page: 1,
        author: "张三",
        content: "这是一个高亮注释",
        timestamp: new Date().toISOString(),
        x: 100,
        y: 200,
        width: 200,
        height: 20,
        selectedText: "重要内容",
        type: "highlight"
      }
    ]
  })
})
```

### 2. 增强导出

```typescript
// 发送请求到 /api/export-enhanced
const response = await fetch('/api/export-enhanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filename: 'example.pdf',
    annotations: annotationData
  })
})
```

## 注释数据格式

```typescript
interface Annotation {
  id: string                              // 唯一标识符
  page: number                           // 页面编号（从1开始）
  author: string                         // 作者名称
  content: string                        // 注释内容
  timestamp: string | Date               // 创建时间
  x: number                             // X坐标
  y: number                             // Y坐标
  width: number                         // 宽度
  height: number                        // 高度
  selectedText: string                  // 选中的文本
  type: "highlight" | "comment" | "note" | "strikeout"
}
```

## 测试步骤

### 1. 准备测试文件
确保 `uploads/` 目录中有测试PDF文件（如 `test.pdf`）

### 2. 运行测试
在浏览器控制台中运行：
```javascript
// 加载测试文件
fetch('/test-export.js').then(r => r.text()).then(eval)

// 执行测试
testExport()
```

### 3. 验证结果
- 下载导出的PDF文件
- 在PDF阅读器中打开（推荐Adobe Acrobat Reader、Firefox PDF Viewer、Chrome PDF Viewer）
- 查看注释面板，确认注释正确显示
- 验证中文内容显示正常

## PDF阅读器兼容性

### ✅ 完全兼容
- Adobe Acrobat Reader DC
- Foxit Reader
- PDF Expert (Mac)

### ✅ 基本兼容
- Chrome 内置PDF查看器
- Firefox 内置PDF查看器
- Edge 内置PDF查看器

### ⚠️ 部分兼容
- Safari PDF查看器（部分注释类型可能不显示）
- 部分移动端PDF应用

## 常见问题解决

### Q: 注释不显示？
A: 检查以下几点：
1. 确保使用兼容的PDF阅读器
2. 检查坐标系统是否正确
3. 验证注释内容是否为空

### Q: 中文显示乱码？
A: 确保：
1. 字体文件路径正确
2. 使用PDFHexString.fromText()处理中文文本
3. 检查字体文件是否支持所需的中文字符

### Q: 注释位置偏移？
A: 注意：
1. PDF坐标系从左下角开始
2. 需要进行Y坐标转换：`pdfY = pageHeight - y - height`
3. 确保页面尺寸计算正确

## 性能优化建议

1. **大文件处理**: 对于大型PDF文件，考虑流式处理
2. **批量注释**: 一次性处理所有注释，避免多次PDF操作
3. **字体缓存**: 复用已嵌入的字体资源
4. **内存管理**: 及时释放大型PDF对象

## 扩展功能建议

### 未来可添加的功能
- [ ] 自由手绘注释
- [ ] 图片注释
- [ ] 音频注释
- [ ] 回复和讨论功能
- [ ] 注释权限管理
- [ ] 批量注释导入/导出

## 总结

当前实现的PDF注释导出功能已经满足了您的核心需求：
1. ✅ 创建真正的PDF注释（而非简单图形）
2. ✅ 完全支持中文显示
3. ✅ 可在PDF阅读器注释面板中正常显示
4. ✅ 支持多种注释类型

推荐使用 `/api/export` 端点进行日常使用，它提供了稳定可靠的PDF注释功能。如需更多高级功能，可以使用 `/api/export-enhanced` 端点。 