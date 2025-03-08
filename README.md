# ai-analysis-bot
本项目是全球首个成功实现"具备策略自适应进化能力的AI分析机器人"的创新实践，专为加密金融市场打造的新一代智能分析系统。通过深度整合华为云ModelArts的计算能力与自主研发的进化算法框架，我们构建了一套能自主学习、动态优化和实时决策的智能分析生态系统。

## 部署指南

### 环境要求
- Node.js 14.x 或更高版本
- npm 6.x 或更高版本
- 稳定的网络连接（用于API调用和Telegram交互）

### 安装步骤

1. **克隆项目仓库**
   ```bash
   git clone [项目仓库URL]
   cd ai-analysis-bot
   ```

2. **安装依赖包**
   ```bash
   npm install
   ```

3. **创建环境配置文件**
   ```bash
   cp .env.example .env
   ```
   或手动创建 `.env` 文件并添加以下配置：

4. **配置环境变量**
   在 `.env` 文件中添加以下必要配置：
   ```
   # Telegram API配置
   TELEGRAM_API_ID=你的API_ID
   TELEGRAM_API_HASH=你的API_HASH
   TELEGRAM_MONITOR_CHANNEL=gmgnsignalsol
   TRADING_BOT_USERNAME=@US_GMGNBOT
   
   # DeepSeek API配置
   DEEPSEEK_API_KEY=你的DeepSeek API密钥
   DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   DEEPSEEK_MODEL=deepseek-ai/DeepSeek-V3
   
   # OpenAI API配置（可选）
   OPENAI_API_KEY=你的OpenAI API密钥
   OPENAI_API_URL=https://api.openai.com/v1/chat/completions
   OPENAI_MODEL=gpt-4
   
   # 交易配置
   DEFAULT_BUY_AMOUNT=0.01  # 默认购买金额（SOL）
   ```

5. **创建日志目录**
   ```bash
   mkdir -p logs
   ```

### 启动流程

1. **首次启动（Telegram认证）**
   ```bash
   npm start
   ```
   首次启动时，系统会提示进行Telegram身份验证：
   - 输入您的手机号码（包含国家代码，如+8613800138000）
   - 输入Telegram发送给您的验证码
   - 如果设置了两步验证，还需要输入密码

2. **后续启动**
   认证成功后，程序会保存会话信息到 `src/session.json`，后续启动时会自动登录，无需重复验证。

3. **DeepSeek模型测试**
   ```bash
   npm run deepseekTest
   ```
   用于测试DeepSeek API连接是否正常。

4. **查看日志**
   - 交易记录: `logs/trades.json`
   - 策略分析: `logs/trade_analysis.json`
   - 运行日志: 控制台输出

### 功能说明

1. **消息监控**：自动监控指定Telegram频道的消息
2. **AI分析**：使用DeepSeek或OpenAI分析交易信息
3. **自适应进化**：定期分析历史交易数据，优化交易策略
4. **自动交易**：根据分析结果自动执行交易指令

### 故障排查

1. **认证错误**
   如果出现 `getUserInput is not defined` 错误，确保已安装 `input` 库：
   ```bash
   npm install input
   ```

2. **API调用失败**
   检查环境变量中的API密钥和URL是否正确配置

3. **Telegram连接问题**
   - 检查网络连接
   - 确认API_ID和API_HASH正确
   - 尝试删除 `src/session.json` 重新登录

4. **日志目录错误**
   确保项目根目录下存在 `logs` 文件夹

### 项目维护

定期检查并更新依赖包以确保安全性：
```bash
npm update
```

## 许可证

本项目为专有软件，未经授权不得使用、复制或分发。
