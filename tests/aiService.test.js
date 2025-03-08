const AIService = require('../src/index').AIService;
const { jest } = require('@jest/globals');

describe('AIService 单元测试', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIService();
  });

  test('调用 DeepSeek API 成功', async () => {
    const mockResponse = {
      data: {
        choices: [{ message: { content: '报告结果：建议购买' } }]
      }
    };

    jest.spyOn(aiService, 'callDeepseekAPI').mockResolvedValue(mockResponse.data.choices[0].message.content);

    const result = await aiService.analyzeTrading('测试消息', { model: 'deepseek' });
    expect(result.shouldBuy).toBe(true);
    expect(result.reason).toContain('建议购买');
  });

  test('调用 OpenAI API 成功', async () => {
    const mockResponse = {
      data: {
        choices: [{ message: { content: '报告结果：建议放弃' } }]
      }
    };

    jest.spyOn(aiService, 'callOpenAIAPI').mockResolvedValue(mockResponse.data.choices[0].message.content);

    const result = await aiService.analyzeTrading('测试消息', { model: 'openai' });
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain('建议放弃');
  });

  test('未配置 API Key 抛出错误', async () => {
    aiService.models.deepseek.apiKey = null;
    await expect(aiService.callDeepseekAPI('测试提示词')).rejects.toThrow('未配置 DEEPSEEK_API_KEY 环境变量');
  });
});