require('dotenv').config();
const input = require('input'); 
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');
const axios = require('axios');


/**
 * AI服务类
 * 负责与不同的AI模型API进行交互，多模态支持，提供交易分析功能
 * @class AIService
 */
class AIService {
  constructor() {
    // 支持的模型配置
    this.models = {
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL,
        modelName: process.env.DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3'
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        apiUrl: process.env.OPENAI_API_URL,
        modelName: process.env.OPENAI_MODEL || 'gpt-4'
      }
    };
    
    // 默认使用的模型
    this.defaultModel = process.env.DEFAULT_AI_MODEL || 'deepseek';
  }

/**
   * 分析交易信息
   * @param {string} message - 需要分析的原始消息
   * @param {Object} [options={}] - 分析选项
   * @param {string} [options.model] - 使用的AI模型名称
   * @param {string} [options.buyAmount] - 购买金额
   * @returns {Promise<Object>} 分析结果对象
   * @returns {boolean} result.shouldBuy - 是否建议购买
   * @returns {string} result.reason - 建议理由
   * @returns {string} result.fullAnalysis - 完整分析报告
   */
  async analyzeTrading(message, options = {}) {
    const modelName = options.model || this.defaultModel;
    const buyAmount = options.buyAmount || process.env.DEFAULT_BUY_AMOUNT || '0.01';
    
    try {
      logger.info(`正在使用 ${modelName} 分析交易信息...`);
      
      // 构建提示词
      const prompt = `
        你是一个顶级加密金融交易专家，帮我深度分析：
        1、我可以接受中级风险投资。
        2、报告里增加情绪分析、趋势预测和风险评估（1-10分，10分最高风险）。
        3、搜索 X 或网络上的最新动态和社区情绪，给我更全面的信息。
        4、综合交易信息与最新动态和社区情绪信息，判断是否买入，给出具体买入理由。
        5、如果建议买入，假设我投入 ${buyAmount} SOL，必须明确给出完整的交易计划，包括买入价格、止损价格、止盈价格和分批卖出计划，交易机器人会按照你给的交易方案执行。
        6、请按照以下格式提供分析报告：
        ### 深度分析报告
        报告结果：[明确写出"建议购买"或"建议放弃"，并简要总结理由]
        
        #### 1. 最新动态与社区情绪
        - 网络上的最新动态：[分析代币的最新市场动态]
        - 社区情绪：[分析社区对该代币的情绪和反应]

        #### 2. 综合判断是否买入
        - 买入理由：[如果建议买入，列出具体理由]
        - 不买理由：[如果不建议买入，列出具体理由]

        #### 3. 交易方案
        - 投入金额：${buyAmount} SOL
        - 买入数量：[根据当前价格计算的买入数量]
        - 卖出策略：
          1. 止盈点：[设定具体的止盈价格和百分比，以及卖出比例]
          2. 止损点：[设定具体的止损价格和百分比]
          3. 分批卖出计划：[详细的分批卖出策略]
        
        #### 4. 风险控制
        - 风险评估：[1-10分，10分为最高风险]
        - 风险因素：[列出主要风险因素]
        - 应对策略：[如何应对可能的风险]

        ### 深度分析报告结束

        原始信息如下：
        ${message}
      `;
      
      // 调用 AI API
      let aiResponse;
      if (modelName === 'deepseek') {
        aiResponse = await this.callDeepseekAPI(prompt);
      } else if (modelName === 'openai') {
        aiResponse = await this.callOpenAIAPI(prompt);
      } else {
        throw new Error(`不支持的模型: ${modelName}`);
      }
      
      // 分析响应内容，判断是否建议购买
      const shouldBuy = aiResponse.toLowerCase().includes('报告结果：建议购买');
      
      // 提取理由
      let reason = aiResponse;
      if (reason.length > 200) {
        reason = reason.substring(0, 200) + '...';
      }
      
      return {
        shouldBuy,
        reason,
        fullAnalysis: aiResponse
      };
    } catch (error) {
      logger.error(`${modelName} 分析失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 调用DeepSeek API
   * @param {string} prompt - 提示词
   * @param {string} [systemContent='你是一个专业的加密货币交易分析师，擅长分析市场趋势和代币表现。'] - 系统提示内容
   * @returns {Promise<string>} API响应内容
   * @throws {Error} 当API调用失败时抛出错误
   */
  async callDeepseekAPI(prompt, systemContent = '你是一个专业的加密货币交易分析师，擅长分析市场趋势和代币表现。') {
    const maxRetries = 3;
    const retryDelay = 2000; // 2秒延迟
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const deepseekApiKey = this.models.deepseek.apiKey;
        const deepseekApiUrl = this.models.deepseek.apiUrl;
        const modelName = this.models.deepseek.modelName;
        
        if (!deepseekApiKey) {
          throw new Error('未配置 DEEPSEEK_API_KEY 环境变量');
        }
        
        const response = await axios.post(deepseekApiUrl, {
          model: modelName,
          messages: [
            {
              role: 'system',
              content: systemContent
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          frequency_penalty: 0.5,
          n: 1
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`
          }
        });
        
        return response.data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 429) {
          logger.warn(`API 请求限制，第 ${attempt} 次重试...`);
          await this.sleep(retryDelay * attempt); // 指数退避
          continue;
        }
        
        logger.error(`Deepseek API 调用失败：${error.message}`);
        if (error.response) {
          logger.error(`状态码: ${error.response.status}`);
          logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
          logger.error(`响应头: ${JSON.stringify(error.response.headers)}`);
        }
        throw error;
      }
    }
    
    throw lastError;
  }
  
  /**
   * 调用OpenAI API
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} API响应内容
   * @throws {Error} 当API调用失败时抛出错误
   */
  async callOpenAIAPI(prompt) {
    const apiKey = this.models.openai.apiKey;
    const apiUrl = this.models.openai.apiUrl;
    const modelName = this.models.openai.modelName;
    
    if (!apiKey) {
      throw new Error('未配置 OPENAI_API_KEY 环境变量');
    }
    
    const response = await axios.post(apiUrl, {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的加密货币交易分析师，擅长分析市场趋势和代币表现。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.data.choices[0].message.content;
  }

    /**
   * 延时函数
   * @param {number} ms - 延时毫秒数
   * @returns {Promise<void>} 延时Promise
   * @private
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
/**
 * AI 自进化智能决策机器人
 * 负责监听交易信号，分析报告，并执行交易
 * @class AiAnalysisBot
 */
class AiAnalysisBot {
  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
    this.apiHash = process.env.TELEGRAM_API_HASH || '';
    this.sessionFile = path.join(__dirname, 'session.json');
    this.stringSession = new StringSession('');
    this.monitorChannel = process.env.TELEGRAM_MONITOR_CHANNEL;
    this.client = null;
    this.eventHandler = null; // 初始化事件处理器引用
    this.loadSession();
  }

  /**
   * 从本地加载会话信息
   * @returns {void}
   */
  loadSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
        this.stringSession = new StringSession(sessionData.session);
        logger.info('已从本地加载会话信息');
      }
    } catch (error) {
      logger.error('加载会话信息失败：', error);
    }
  }

  /**
   * 保存会话信息到本地
   * @param {string} session - 会话字符串
   * @returns {void}
   */
  saveSession(session) {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify({ session }));
      logger.info('会话信息已保存到本地');
    } catch (error) {
      logger.error('保存会话信息失败：', error);
    }
  }

  /**
   * 启动机器人
   * @returns {Promise<void>}
   * @throws {Error} 当登录失败达到最大重试次数时抛出错误
   */
  async start() {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        this.client = new TelegramClient(
          this.stringSession,
          this.apiId,
          this.apiHash,
          { connectionRetries: 5 }
        );

        // 如果有保存的会话信息，尝试直接连接
        if (this.stringSession.length > 0) {
          try {
            await this.client.connect();
            const me = await this.client.getMe();
            if (me) {
              logger.info('使用已保存的会话信息成功登录');
              await this.setupMessageMonitor();
              return;
            }
          } catch (error) {
            logger.error('使用保存的会话信息登录失败，将尝试重新登录：', error);
          }
        }

        // 如果没有会话信息或会话失效，进行交互式登录
        await this.client.start({
          phoneNumber: async () => {
            return await input.text('请输入您的电话号码（包含国家代码）：');
          },
          password: async () => {
            return await input.text('请输入两步验证密码（如果没有请直接回车）：');
          },
          phoneCode: async () => {
            const code = await input.text('请输入Telegram发送的验证码（5位数字）：');
            if (!/^\d{5}$/.test(code)) {
              throw new Error('验证码格式错误，请输入5位数字');
            }
            return code;
          },
          onError: (err) => {
            logger.error('认证过程出错：', err);
            if (err.message === 'AUTH_USER_CANCEL') {
              logger.info('认证已取消，请重新尝试...');
            }
          }
        });
        logger.info('成功登录Telegram！');

        // 保存会话字符串以便后续使用
        const session = this.client.session.save();
        this.saveSession(session);
        
        // 实现策略自适应进化机制
        this.evolveStrategy();

        // 开始监听消息
        await this.setupMessageMonitor();
        return;

      } catch (error) {
        retryCount++;
        logger.error(`第 ${retryCount} 次登录尝试失败：${error.message}`);
        
        if (retryCount < maxRetries) {
          logger.info(`将在 5 秒后进行第 ${retryCount + 1} 次重试...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          logger.error('达到最大重试次数，启动失败');
          throw error;
        }
      }
    }
  }

  /**
   * 设置消息监听器
   * @returns {Promise<void>}
   * @throws {Error} 当设置监听器失败时抛出错误
   */
  async setupMessageMonitor() {
    try {
      logger.info(`开始监听 @${this.monitorChannel} 频道的消息`);
      
      // 存储事件处理器的引用，以便后续可以移除
      if (this.eventHandler) {
        // 如果已存在事件处理器，先移除它
        this.client.removeEventHandler(this.eventHandler);
        logger.info('已移除旧的消息监听器');
      }
        
      // 创建新的事件处理器
      this.eventHandler = async (update) => {
        try {
            const message = update.message;
            if (!message) return;

            const messageText = message.message || '';

            // 直接使用 InfoParser.parseMessage 来处理消息，让它来判断消息类型
            const tokenInfo = InfoParser.parseMessage(messageText);

            // 只处理已知类型的消息
            if (tokenInfo && tokenInfo.type !== 'unknown') {
                logger.info(`检测到目标消息:\n${messageText}`);
                await this.handleNewMessage(messageText, tokenInfo);
            }
        } catch (error) {
          logger.error('处理消息时出错：', error);
        }
      };
      
      // 添加事件处理器
      this.client.addEventHandler(this.eventHandler);

      logger.info('消息监听器设置完成');

    } catch (error) {
      logger.error('设置消息监听器时出错：', error);
      throw error;
    }
  }

    /**
   * 处理新消息
   * @param {string} message - 原始消息内容
   * @param {Object} tokenInfo - 解析后的代币信息
   * @returns {Promise<void>}
   */
  async handleNewMessage(message,tokenInfo) {
    try {
      logger.info('正在处理 New 消息...');
      
      // 使用 AIService 进行分析
      const analysisResult = await aiService.analyzeTrading(message, {
        buyAmount: process.env.DEFAULT_BUY_AMOUNT
      });
      logger.info(`AI 分析完整报告:  - ${analysisResult.fullAnalysis}`);

      // 添加 tokenInfo 到分析结果
      analysisResult.tokenInfo = tokenInfo;

      // 根据分析结果决定是否购买
      if (analysisResult.shouldBuy) {
        logger.info(`AI 分析结果: 建议购买 - ${analysisResult.reason}`);
        // 执行购买逻辑
        await this.executeBuyOrder(message, tokenInfo, analysisResult.fullAnalysis);
      } else {
        logger.info(`AI 分析结果: 建议放弃 - ${analysisResult.reason}`);
      }
    } catch (error) {
      logger.error('处理 New 消息时出错：', error);
    }
  }

  /**
   * 执行策略自适应进化分析
   * @returns {Promise<Object>} 分析结果
   * @returns {boolean} result.success - 是否成功
   * @returns {string} [result.message] - 失败原因
   * @returns {string} [result.result] - 分析结果
   */
async evolveStrategy() {
  try {
    logger.info('------开始执行策略自适应进化分析...');
    
    // 加载历史交易数据
    const tradeLogFile = path.join(__dirname, '../logs/trades.json');
    let tradeHistory = [];
    
    if (fs.existsSync(tradeLogFile)) {
      const fileContent = fs.readFileSync(tradeLogFile, 'utf8');
      tradeHistory = JSON.parse(fileContent);
    }
    
    if (tradeHistory.length === 0) {
      logger.info('没有历史交易数据可供分析');
      return {
        success: false,
        message: '没有历史交易数据可供分析'
      };
    }
    
    // 提取关键特征
    const features = tradeHistory.map(trade => {
      // 从分析结果中提取关键信息
      const analysis = trade.analysisResult.toLowerCase();
      
      return {
        tokenSymbol: trade.tokenSymbol,
        timestamp: trade.timestamp,
        // 社区情绪和市场动态
        communityMood: analysis.includes('社区情绪积极') || analysis.includes('社区反应良好') ? '积极' : 
        analysis.includes('社区情绪消极') || analysis.includes('社区反应不佳') ? '消极' : '中性',
        // 买入决策相关
        decision: analysis.includes('建议购买') ? '购买' : '放弃',
        // 风险评估
        riskLevel: (analysis.match(/风险评估：(\d+)/) || [])[1] || '未知',
        // 资金流动相关
        hasNegativeNetInflow: analysis.includes('净流入为负') || analysis.includes('资金流出'),
        hasHighVolatility: analysis.includes('高波动性') || analysis.includes('波动性高') || analysis.includes('极高的波动性'),
        hasDeveloperSellAll: analysis.includes('sell all') || analysis.includes('开发者卖出'),
        hasLowLiquidity: analysis.includes('流动性低') || analysis.includes('流动性较低'),
        hasKOLBuying: analysis.includes('kol') && analysis.includes('买入'),
        // 交易计划相关
        hasProfitTarget: analysis.includes('止盈点') || analysis.includes('止盈价格'),
        hasStopLoss: analysis.includes('止损点') || analysis.includes('止损价格'),
        hasBatchSelling: analysis.includes('分批卖出') || analysis.includes('分批出售'),
        // 交易结果（如果有）
        tradingResult: trade.tradingResult || '未知',
        // 原始数据
        buyAmount: trade.buyAmount,
        tokenAddress: trade.tokenAddress
        // 可以添加更多特征...
      };
    });
    
    // 构建分析提示词
    const historicalPrompt = `
    请分析以下历史交易数据，找出决策模式和改进方向：
    ${JSON.stringify(features)}
    
    请提供以下分析：
    1. 失败交易的3个主要原因
    2. 成功交易的3个关键特征
    3. 改进交易策略的3个建议
    4. 是否存在可能错过的潜在机会（例如，拒绝了但市场表现良好的代币）
    5. 如何调整决策阈值以提高成功率
    `;
    
    // 调用Deepseek API进行分析
    const systemContent = '你是一个专业的加密货币数据分析师，擅长从历史数据中总结经验并提供具体的改进建议。';
    const analysisResult = await aiService.callDeepseekAPI(historicalPrompt, systemContent);
    
    // 保存分析结果
    const analysisLogFile = path.join(__dirname, '../logs/trade_analysis.json');  
    const historyLogFile = path.join(__dirname, '../logs/trade_analysis_history.json');  

    // 准备新的分析数据
    const analysisData = {
      timestamp: new Date().toISOString(),
      totalTrades: tradeHistory.length,
      analysisResult
    };

    // 保存历史记录
    let historyData = [];
    if (fs.existsSync(historyLogFile)) {
      historyData = JSON.parse(fs.readFileSync(historyLogFile, 'utf8'));
    }
    historyData.push(analysisData);
    fs.writeFileSync(historyLogFile, JSON.stringify(historyData, null, 2));

    // 只保存最新的分析结果
    fs.writeFileSync(analysisLogFile, JSON.stringify(analysisData, null, 2));
    
    logger.info('策略分析完成，结果已更新');
    logger.info(`历史分析记录已保存到 ${historyLogFile}`);
    
    return {
      success: true,
      result: analysisResult
    };
  } catch (error) {
    logger.error('分析历史交易数据时出错：', error);
    return {
      success: false,
      message: `分析出错: ${error.message}`
    };
  }
}

  /**
   * 执行购买订单
   * @param {string} message - 原始消息内容
   * @param {Object} tokenInfo - 代币信息对象，包含地址、名称、符号等
   * @param {string} analysisResult - AI分析结果
   * @returns {Promise<boolean>} 交易执行结果，成功返回true，失败返回false
   */
  async executeBuyOrder(message,tokenInfo, analysisResult) {
    try {
      logger.info('准备执行购买订单...');
      
      // 默认购买金额（SOL）
      let buyAmount = process.env.DEFAULT_BUY_AMOUNT || '0.01';
      
      // 构建购买命令
      const buyCommand = `/buy ${tokenInfo.address} ${buyAmount}`;
      logger.info(`准备执行购买命令: ${buyCommand}`);
      
      // 发送购买命令到交易机器人
      const tradingBot = process.env.TRADING_BOT_USERNAME || '@US_GMGNBOT';
      await this.client.sendMessage(tradingBot, { message: buyCommand });
      
      logger.info(`已发送购买命令到 ${tradingBot}`);
      
      // 记录交易信息
      const tradeInfo = {
        timestamp: new Date().toISOString(),
        tokenAddress: tokenInfo.address,
        tokenName: tokenInfo.name,
        tokenSymbol: tokenInfo.symbol,
        buyAmount: buyAmount,
        oldMessage:message,
        analysisResult: analysisResult
      };
      
      // 保存交易记录到文件
      this.saveTradeRecord(tradeInfo);
      
      return true;
    } catch (error) {
      logger.error(`执行购买订单时出错: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 保存交易记录到日志文件
   * @param {Object} tradeInfo - 交易信息对象
   * @param {string} tradeInfo.timestamp - 交易时间戳
   * @param {string} tradeInfo.tokenAddress - 代币合约地址
   * @param {string} tradeInfo.tokenName - 代币名称
   * @param {string} tradeInfo.tokenSymbol - 代币符号
   * @param {string} tradeInfo.buyAmount - 购买金额
   * @param {string} tradeInfo.oldMessage - 原始消息
   * @param {string} tradeInfo.analysisResult - 分析结果
   */
  saveTradeRecord(tradeInfo) {
    try {
      const tradeLogFile = path.join(__dirname, '../logs/trades.json');
      let trades = [];
      
      // 如果文件存在，读取现有交易记录
      if (fs.existsSync(tradeLogFile)) {
        const fileContent = fs.readFileSync(tradeLogFile, 'utf8');
        trades = JSON.parse(fileContent);
      }
      
      // 添加新的交易记录
      trades.push(tradeInfo);
      
      // 限制日志文件大小，保留最近的100条记录
      if (trades.length > 100) {
        trades = trades.slice(-100);
      }
      
      // 确保日志目录存在
      const logDir = path.join(__dirname, '../logs'); 
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // 保存更新后的交易记录
      fs.writeFileSync(tradeLogFile, JSON.stringify(trades, null, 2));
      logger.info(`交易记录已保存到 ${tradeLogFile}`);
    } catch (error) {
      logger.error(`保存交易记录时出错: ${error.message}`);
    }
  }

}

/**
 * 信息解析器类，用于解析不同类型的消息
 * @class InfoParser
 */
class InfoParser {

/**
   * 通用解析方法，根据消息内容选择合适的解析器
   * @param {string} message - 原始消息内容
   * @returns {Object} 解析后的代币信息
   * @returns {string} result.chain - 区块链生态 (Solana/Ethereum/Binance Smart Chain)
   */
static parseMessage(message) {
  let chain = 'Solana'; // 默认 Solana
  if (message.includes('Ethereum')) {
    chain = 'Ethereum';
  } else if (message.includes('Binance Smart Chain')) {
    chain = 'Binance Smart Chain';
  }else if (message.includes('Ton')) {
    chain = 'Ton';
  }
  
  const result = { chain, type: 'unknown', rawMessage: message };
  if (message.includes('KOL Buy')) {
    const parsed = this.parseKOLBuy(message);
    if (parsed) {
      return { ...parsed, chain, type: 'kolBuy' };
    }
  } else if (message.includes('ATH Price')) {
    const parsed = this.parseATHPrice(message);
    if (parsed) {
      return { ...parsed, chain, type: 'athPrice' };
    }
  }

  return result;
}

  /**
   * 解析KOL购买消息
   * @param {string} message - 原始KOL购买消息
   * @returns {Object} 解析后的代币信息对象
   */
  static parseKOLBuy(message) {
    const tokenInfo = {
      name: '',           // Solana Foundation Cat
      symbol: '',         // soliloquy
      address: '',        // DPfhZt2wjTYTsA3JjNEJCDyX3Rn1ef8sbje6AMGDpump
      netInflow: {        // KOL资金流入信息
        amount: '',       // $-22.7K
        sol: ''          // -154.7217 Sol
      },
      kolActivity: {      // KOL活动信息
        buys: '',        // 32
        sells: ''        // 40
      },
      priceChange: {
        '5m': '',
        '1h': '',
        '6h': ''
      },
      transactions: '',   // 61
      volume: '',        // $29.1K
      marketCap: '',     // $163.8K
      liquidity: {
        sol: '',         // 253.08 SOL
        usd: '',         // $74.3K
        burnRate: ''     // 100%
      },
      holders: '',       // 1475
      openTime: '',      // 142d
      security: {
        noMint: false,
        blacklist: false,
        burnt: false,
        top10Percent: '' // 新增 TOP 10 持有比例
      },
      developer: {        // 新增开发者信息
        status: '',      // Sell All
        burnt: '',       // 0
        burnRate: ''     // %
      }
    };
    
    // 提取代币名称和符号 - 格式为 $symbol(name)
    const tokenMatch = message.match(/\$([^(]+)\(([^)]+)\)/);
    if (tokenMatch) {
      tokenInfo.symbol = tokenMatch[1].trim();
      tokenInfo.name = tokenMatch[2].trim();
    } else {
      // 尝试从标题中提取符号
      const titleMatch = message.match(/KOL Buy ([^!]+)!/);
      if (titleMatch) {
        tokenInfo.symbol = titleMatch[1].trim();
      }
    }
    
    // 提取代币地址 - 通常是单独一行的长字符串
    const lines = message.split('\n');
    for (const line of lines) {
      // 修改正则表达式以匹配更多格式的地址
      if (line.match(/^[A-Za-z0-9]{32,}pump$/) || line.match(/^[A-Za-z0-9]{32,}$/)) {
        tokenInfo.address = line.trim();
        break;
      }
    }
    
    // 提取 KOL 资金流入信息 - 支持负值和K/M单位
    const inflowMatch = message.match(/KOL Inflow净流入:\$([-0-9.]+[KM]?)\(([-0-9.]+) Sol\)/);
    if (inflowMatch) {
      tokenInfo.netInflow.amount = `$${inflowMatch[1]}`;
      tokenInfo.netInflow.sol = `${inflowMatch[2]} Sol`;
    }
    
    // 提取 KOL 买卖活动
    const kolActivityMatch = message.match(/KOL Buy\/Sell:([0-9]+)\/([0-9]+)/);
    if (kolActivityMatch) {
      tokenInfo.kolActivity.buys = kolActivityMatch[1];
      tokenInfo.kolActivity.sells = kolActivityMatch[2];
    }
    
    // 提取价格变化
    const priceChangeMatch = message.match(/📈 5m \| 1h \| 6h: ([^%]+)% \| ([^%]+)% \| ([^%]+)%/);
    if (priceChangeMatch) {
      tokenInfo.priceChange['5m'] = priceChangeMatch[1] + '%';
      tokenInfo.priceChange['1h'] = priceChangeMatch[2] + '%';
      tokenInfo.priceChange['6h'] = priceChangeMatch[3] + '%';
    }
    
    // 提取交易次数和交易量 - 支持K/M单位
    const txMatch = message.match(/🎲 5m TXs\/Vol: ([^/]+)\/\$([^K]+)K/);
    if (txMatch) {
      tokenInfo.transactions = txMatch[1];
      tokenInfo.volume = `$${txMatch[2]}K`;
    }
    
    // 提取市值 - 支持K/M单位
    const mcapMatch = message.match(/💡 MCP: \$([^K]+)K/);
    if (mcapMatch) {
      tokenInfo.marketCap = `$${mcapMatch[1]}K`;
    } else {
      const mcapMatchM = message.match(/💡 MCP: \$([^M]+)M/);
      if (mcapMatchM) {
        tokenInfo.marketCap = `$${mcapMatchM[1]}M`;
      }
    }
    
    // 提取流动性
    const liqMatch = message.match(/💧 Liq: ([^ ]+) SOL \(\$([^K]+)K 🔥([^%]+)%\)/);
    if (liqMatch) {
      tokenInfo.liquidity.sol = `${liqMatch[1]} SOL`;
      tokenInfo.liquidity.usd = `$${liqMatch[2]}K`;
      tokenInfo.liquidity.burnRate = `${liqMatch[3]}%`;
    }
    
    // 提取持有者数量
    const holderMatch = message.match(/👥 Holder: ([0-9,]+)/);
    if (holderMatch) {
      tokenInfo.holders = holderMatch[1];
    }
    
    // 提取开放时间
    const openTimeMatch = message.match(/🕒 Open: ([^ago]+)ago/);
    if (openTimeMatch) {
      tokenInfo.openTime = openTimeMatch[1].trim();
    }
    
    // 提取安全信息
    tokenInfo.security.noMint = message.includes('✅ NoMint');
    tokenInfo.security.blacklist = message.includes('✅Blacklist');
    tokenInfo.security.burnt = message.includes('✅Burnt');
    
    // 提取 TOP 10 持有比例 - 同时支持 ✅ 和 ❌ 前缀
    const top10Match = message.match(/[✅❌]TOP 10: ([^%]+)%/);
    if (top10Match) {
      tokenInfo.security.top10Percent = top10Match[1] + '%';
    }
    
    // 提取开发者信息 - 更灵活的匹配
    const devStatusMatch = message.match(/⏳ DEV: ([^$\n]+)/);
    if (devStatusMatch) {
      tokenInfo.developer.status = devStatusMatch[1].trim();
    }
    
    // 提取开发者烧币信息
    const devBurntMatch = message.match(/👨‍🍳 DEV Burnt烧币: ([^(]+)\(🔥Rate: ([^)%]*)%\)/);
    if (devBurntMatch) {
      tokenInfo.developer.burnt = devBurntMatch[1].trim();
      tokenInfo.developer.burnRate = devBurntMatch[2] + '%';
    }
    
    return tokenInfo;
  }

  /**
   * 解析ATH价格消息
   * @param {string} message - 原始ATH价格消息
   * @returns {Object} 解析后的代币信息对象
   */  static parseATHPrice(message) {
    const tokenInfo = {
      type: 'athPrice',  // 添加类型标识
      name: '',           // Neymar Jr
      symbol: '',         // Neymar Jr
      address: '',        // EjAEAvHbiPSfGdK3Hwu9RHqH9fp3gAG76NrxfrauYt2N
      priceChange: {
        '5m': '',
        '1h': '',
        '6h': ''
      },
      transactions: '',   // 2613
      volume: '',        // $44.1K
      marketCap: '',     // $298.6M
      liquidity: {
        sol: '',         // 321.81 SOL
        usd: '',         // $94.6K
        burnRate: ''     // 100%
      },
      holders: '',       // 228
      openTime: '',      // 48min
      security: {
        noMint: false,
        blacklist: false,
        burnt: false,
        top10Percent: '' // 13.47%
      },
      developer: {
        status: '',      // Add Liquidity
        burnt: '',       // 0
        burnRate: ''     // %
      }
    };
    
    // 提取代币名称和符号 - 格式为 $symbol(name)
    const tokenMatch = message.match(/\$([^(]+)\(([^)]+)\)/);
    if (tokenMatch) {
      tokenInfo.symbol = tokenMatch[1].trim();
      tokenInfo.name = tokenMatch[2].trim();
    }
    
    // 提取代币地址 - 通常是单独一行的长字符串
    const lines = message.split('\n');
    for (const line of lines) {
      // 修改正则表达式以匹配更多格式的地址
      if (line.match(/^[A-Za-z0-9]{32,}$/)) {
        tokenInfo.address = line.trim();
        break;
      }
    }
    
    // 提取价格变化
    const priceChangeMatch = message.match(/📈 5m \| 1h \| 6h: ([^%|]+)% \| ([^%|]+)% \| ([^%|]+)%/);
    if (priceChangeMatch) {
      tokenInfo.priceChange['5m'] = priceChangeMatch[1] + '%';
      tokenInfo.priceChange['1h'] = priceChangeMatch[2] + '%';
      tokenInfo.priceChange['6h'] = priceChangeMatch[3] + '%';
    }
    
    // 提取交易次数和交易量
    const txMatch = message.match(/🎲 5m TXs\/Vol: ([^/]+)\/\$([^K]+)K/);
    if (txMatch) {
      tokenInfo.transactions = txMatch[1];
      tokenInfo.volume = `$${txMatch[2]}K`;
    }
    
    // 提取市值 - 支持K/M单位
    const mcapMatchK = message.match(/💡 MCP: \$([^K]+)K/);
    if (mcapMatchK) {
      tokenInfo.marketCap = `$${mcapMatchK[1]}K`;
    } else {
      const mcapMatchM = message.match(/💡 MCP: \$([^M]+)M/);
      if (mcapMatchM) {
        tokenInfo.marketCap = `$${mcapMatchM[1]}M`;
      }
    }
    
    // 提取流动性
    const liqMatch = message.match(/💧 Liq: ([^ ]+) SOL \(\$([^K]+)K 🔥([^%]+)%\)/);
    if (liqMatch) {
      tokenInfo.liquidity.sol = `${liqMatch[1]} SOL`;
      tokenInfo.liquidity.usd = `$${liqMatch[2]}K`;
      tokenInfo.liquidity.burnRate = `${liqMatch[3]}%`;
    }
    
    // 提取持有者数量
    const holderMatch = message.match(/👥 Holder: ([0-9,]+)/);
    if (holderMatch) {
      tokenInfo.holders = holderMatch[1];
    }
    
    // 提取开放时间
    const openTimeMatch = message.match(/🕒 Open: ([^ago]+)ago/);
    if (openTimeMatch) {
      tokenInfo.openTime = openTimeMatch[1].trim();
    }
    
    // 提取安全信息
    tokenInfo.security.noMint = message.includes('✅ NoMint');
    tokenInfo.security.blacklist = message.includes('✅Blacklist');
    tokenInfo.security.burnt = message.includes('✅Burnt');
    
    // 提取 TOP 10 持有比例 - 同时支持 ✅ 和 ❌ 前缀
    const top10Match = message.match(/[✅❌]TOP 10: ([^%]+)%/);
    if (top10Match) {
      tokenInfo.security.top10Percent = top10Match[1] + '%';
    }
    
    // 提取开发者信息 - 更灵活的匹配
    const devStatusMatch = message.match(/⏳ DEV: ([^$\n]+)/);
    if (devStatusMatch) {
      tokenInfo.developer.status = devStatusMatch[1].trim();
    }
    
    // 提取开发者烧币信息
    const devBurntMatch = message.match(/👨‍🍳 DEV Burnt烧币: ([^(]+)\(🔥Rate: ([^)%]*)%\)/);
    if (devBurntMatch) {
      tokenInfo.developer.burnt = devBurntMatch[1].trim();
      tokenInfo.developer.burnRate = devBurntMatch[2] + '%';
    }
    
    return tokenInfo;
  }

}


// 创建并启动机器人实例
const aiService = new AIService();
const bot = new AiAnalysisBot();
bot.start().catch(console.error);

module.exports = bot;