flowchart TD
    subgraph 华为云ECS
        A[Node.js应用] -->|运行| B[AiAnalysisBot]
        B -->|调用| C[AIService]
        B -->|使用| D[InfoParser]
        B -->|读写| E[(日志文件)]
    end
    
    subgraph 华为云ModelArts
        F[AI模型训练]
        G[策略优化模型]
    end
    
    subgraph 外部服务
        H[Telegram API]
        I[DeepSeek API]
        J[OpenAI API]
    end
    
    B <-->|消息交互| H
    C <-->|AI分析请求| I
    C <-->|AI分析请求| J
    E -->|训练数据| F
    F -->|优化模型| G
    G -->|更新策略| B