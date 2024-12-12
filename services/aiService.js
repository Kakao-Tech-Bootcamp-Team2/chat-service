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

    // AI 사용자를 클래스로 정의
    class AIUser {
      constructor(id, name, email, displayName, description) {
        this._id = id;
        this.name = name;
        this.email = email;
        this.isAI = true;
        this.displayName = displayName;
        this.description = description;
      }

      toString() {
        return this.name;
      }
    }

    // AI 사용자 정보를 클래스 인스턴스로 생성
    this.aiUsers = {
      wayneAI: {
        _id: "wayneAI",
        name: "Wayne AI",
        email: "ai@wayne.ai",
        isAI: true,
        displayName: "Wayne AI",
        description: "친절하고 도움이 되는 어시스턴트",
        toString() {
          return this.name;
        },
      },
      consultingAI: {
        _id: "consultingAI",
        name: "Consulting AI",
        email: "ai@consulting.ai",
        isAI: true,
        displayName: "Consulting AI",
        description: "비즈니스 컨설팅 전문가",
        toString() {
          return this.name;
        },
      },
    };
  }

  getAIUser(aiType) {
    const user = this.aiUsers[aiType];
    if (!user) return null;

    // 필요한 필드만 포함하여 반환
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAI: true,
      displayName: user.displayName,
      description: user.description,
      toString() {
        return this.name;
      },
    };
  }

  getAIUsers() {
    // 필요한 필드만 포함하여 반환
    return Object.values(this.aiUsers).map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAI: true,
      displayName: user.displayName,
      description: user.description,
      toString() {
        return this.name;
      },
    }));
  }

  async generateResponse(message, persona = "wayneAI", callbacks) {
    try {
      const mentionMatch = message.match(/@(wayneAI|consultingAI)/);
      if (mentionMatch) {
        persona = mentionMatch[1];
      }

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

      const cleanMessage = message
        .replace(/@(wayneAI|consultingAI)/g, "")
        .trim();

      callbacks?.onStart?.();

      const response = await this.openaiClient.post(
        "/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `당신은 ${aiPersona.name}입니다. ${aiPersona.role}로서, ${aiPersona.traits} ${aiPersona.tone}으로 대화��니다.`,
            },
            {
              role: "user",
              content: cleanMessage,
            },
          ],
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      let fullContent = "";

      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split("\n")
          .filter((line) => line.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                callbacks?.onChunk?.(content);
              }
            } catch (e) {
              console.error("Chunk parsing error:", e);
            }
          }
        }
      }

      callbacks?.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      console.error("AI response generation error:", error);
      callbacks?.onError?.(error);
      throw error;
    }
  }
}

module.exports = new AIService();
