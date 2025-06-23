# API配置说明

## DeepSeek API配置

在项目根目录创建 `.env.local` 文件，添加以下环境变量：

```bash
# DeepSeek API配置 (火山引擎)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DEEPSEEK_MODEL=ep-20241230140435-zqgxp
```

## 配置说明

- `DEEPSEEK_API_KEY`: 火山引擎的API密钥
- `DEEPSEEK_BASE_URL`: 火山引擎API的基础URL
- `DEEPSEEK_MODEL`: DeepSeek-R1模型的端点ID

## 获取API密钥

1. 访问火山引擎控制台
2. 创建或选择你的应用
3. 获取API密钥
4. 配置DeepSeek-R1模型端点

## 使用说明

配置完成后，在PDF批注界面点击"自动批注"按钮即可使用AI分析功能。 