const AiAnalysisBot = require('../src/index').AiAnalysisBot;
const { jest } = require('@jest/globals');

describe('AiAnalysisBot 集成测试', () => {
  let bot;

  beforeEach(() => {
    bot = new AiAnalysisBot();
    jest.spyOn(bot, 'setupMessageMonitor').mockResolvedValue();
    jest.spyOn(bot, 'saveSession').mockImplementation(() => {});
  });

  test('机器人成功启动并连接', async () => {
    jest.spyOn(bot.client, 'connect').mockResolvedValue();
    jest.spyOn(bot.client, 'getMe').mockResolvedValue({ username: 'test_user' });

    await bot.start();
    expect(bot.client.connect).toHaveBeenCalled();
    expect(bot.setupMessageMonitor).toHaveBeenCalled();
  });

  test('机器人登录失败后重试', async () => {
    jest.spyOn(bot.client, 'connect').mockRejectedValueOnce(new Error('连接失败'));
    jest.spyOn(bot.client, 'connect').mockResolvedValueOnce();
    jest.spyOn(bot.client, 'getMe').mockResolvedValue({ username: 'test_user' });

    await bot.start();
    expect(bot.client.connect).toHaveBeenCalledTimes(2);
  });

  test('机器人达到最大重试次数后抛出错误', async () => {
    jest.spyOn(bot.client, 'connect').mockRejectedValue(new Error('连接失败'));

    await expect(bot.start()).rejects.toThrow('达到最大重试次数，启动失败');
    expect(bot.client.connect).toHaveBeenCalledTimes(3);
  });
});