/**
 * 华为云 Deepseek API 测试程序
 * 用于验证 API 连接和认证是否正常
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

async function testHuaweiDeepseekAPI() {
  try {
    logger.info('开始测试华为云 Deepseek API 连接...');
    
    // 从环境变量获取 API 密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('未设置 HUAWEI_DEEPSEEK_API_KEY 环境变量');
    }
    
    // API 地址
    const apiUrl = process.env.DEEPSEEK_API_URL;
    
    // 请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // 请求数据
    const data = {
      "model": "DeepSeek-V3",
      "max_tokens": 1024,
      "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "你好"}
      ],
      "stream": false,
      "temperature": 0.6
    };
    
    logger.info(`正在发送请求到: ${apiUrl}`);
    logger.info(`请求数据: ${JSON.stringify(data, null, 2)}`);
    
    // 发送请求，禁用 SSL 验证
    const response = await axios.post(apiUrl, data, {
      headers: headers,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
    
    // 输出结果
    logger.info(`状态码: ${response.status}`);
    logger.info(`响应数据: ${JSON.stringify(response.data, null, 2)}`);
    
    // 保存结果到文件
    const resultPath = path.join(__dirname, '../../logs/huawei_deepseek_test_result.json');
    fs.writeFileSync(resultPath, JSON.stringify(response.data, null, 2));
    logger.info(`测试结果已保存到: ${resultPath}`);
    
    return {
      success: true,
      data: response.data
    };
    
  } catch (error) {
    logger.error(`测试失败: ${error.message}`);
    
    if (error.response) {
      logger.error(`状态码: ${error.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
      logger.error(`响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  logger.info('直接运行测试程序...');
  testHuaweiDeepseekAPI()
    .then(result => {
      if (result.success) {
        logger.info('测试成功完成!');
      } else {
        logger.error('测试失败!');
      }
    })
    .catch(err => {
      logger.error(`未捕获的错误: ${err.message}`);
    });
}

module.exports = { testHuaweiDeepseekAPI };