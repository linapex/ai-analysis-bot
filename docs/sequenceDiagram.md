sequenceDiagram
    participant TC as Telegram频道
    participant Bot as AiAnalysisBot
    participant Parser as InfoParser
    participant AI as AIService
    participant API as AI API服务
    participant TBot as 交易机器人
    participant Log as 日志系统
    
    TC->>Bot: 发送代币信号
    Bot->>Parser: 解析消息
    Parser-->>Bot: 返回代币信息
    Bot->>AI: 请求分析
    AI->>API: 调用AI服务
    API-->>AI: 返回分析结果
    AI-->>Bot: 返回决策建议
    
    alt 建议购买
        Bot->>TBot: 发送购买命令
        Bot->>Log: 记录交易信息
    else 建议放弃
        Bot->>Log: 记录分析结果
    end
    
    Note over Bot,Log: 定期执行策略进化分析
    Bot->>Log: 读取历史交易
    Bot->>AI: 请求策略优化
    AI->>API: 调用AI服务
    API-->>AI: 返回优化建议
    AI-->>Bot: 更新交易策略
    Bot->>Log: 记录优化结果