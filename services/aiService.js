const axios = require("axios");
const { openaiApiKey } = require("../config/keys");
const socketService = require("./socketService");

class AIService {
  constructor() {
    this.openaiClient = axios.create({
      baseURL: "https://api.openai.com/v1",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
    });
    this.streamingSessions = new Map();
  }

  async generateResponse(message, persona = "wayneAI", callbacks) {
    try {
      const aiPersona = {
        wayneAI: {
          name: "Wayne AI",
          role: "친절하고 도움이 되는 어시스턴트",
          traits:
            "전문적이고 통찰력 있는 답변을 제공하며, 사용자의 질문을 깊이 이해하고 명확한 설명을 제공합니다.",
          tone: "전문적이면서도 친근한 톤",
        },
        consultingAI: {
          name: "Consulting AI",
          role: "비즈니스 컨설팅 전문가",
          traits:
            "비즈니스 전략, 시장 분석, 조직 관리에 대한 전문적인 조언을 제공합니다.",
          tone: "전문적이고 분석적인 톤",
        },
      }[persona];

      // ... (기존 aiService.js의 generateResponse 로직 유지)
    } catch (error) {
      console.error("AI response generation error:", error);
      throw error;
    }
  }
}

module.exports = new AIService();
