import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { MCPClient } from './mcp-client.js';
import { pino } from 'pino';

const logger = pino({ level: 'info' });

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private mcpClient: MCPClient;
  private model: any;

  constructor(apiKey: string, mcpClient: MCPClient) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.mcpClient = mcpClient;
  }

  private convertMCPToolsToGemini(mcpTools: any[]) {
    return mcpTools.map((tool: any) => {
      const properties: any = {};
      const required: string[] = [];

      if (tool.inputSchema?.properties) {
        for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
          const prop: any = value;
          properties[key] = {
            type: this.convertType(prop.type),
            description: prop.description || '',
          };

          if (prop.items) {
            properties[key].items = {
              type: this.convertType(prop.items.type),
            };
          }
        }
      }

      if (tool.inputSchema?.required) {
        required.push(...tool.inputSchema.required);
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties,
          required,
        },
      };
    });
  }

  private convertType(type: string): SchemaType {
    const typeMap: Record<string, SchemaType> = {
      'string': SchemaType.STRING,
      'number': SchemaType.NUMBER,
      'integer': SchemaType.INTEGER,
      'boolean': SchemaType.BOOLEAN,
      'array': SchemaType.ARRAY,
      'object': SchemaType.OBJECT,
    };
    return typeMap[type.toLowerCase()] || SchemaType.STRING;
  }

  async chat(userMessage: string): Promise<string> {
    try {
      const mcpTools = await this.mcpClient.listTools();
      const geminiTools = this.convertMCPToolsToGemini(mcpTools);

      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ functionDeclarations: geminiTools }],
        systemInstruction:
          'Você é um assistente que ajuda eleitores brasileiros a acompanharem votações na Câmara dos Deputados. ' +
          'Use as funções disponíveis para buscar informações atualizadas e responda de forma clara e objetiva em português.',
      });

      const chat = this.model.startChat();
      let result = await chat.sendMessage(userMessage);

      let maxIterations = 5;
      let iterations = 0;

      while (iterations < maxIterations) {
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          break;
        }

        logger.info({ functionCalls: functionCalls.length }, 'Gemini calling functions');

        const functionResponses = [];

        for (const call of functionCalls) {
          logger.info({ functionName: call.name, args: call.args }, 'Executing function');

          try {
            const mcpResult = await this.mcpClient.callTool(call.name, call.args);
            const resultText = mcpResult.content?.[0]?.text || JSON.stringify(mcpResult);

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: resultText },
              },
            });
          } catch (error: any) {
            logger.error({ error, functionName: call.name }, 'Function execution failed');
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: error.message },
              },
            });
          }
        }

        result = await chat.sendMessage(functionResponses);
        iterations++;
      }

      const finalResponse = result.response;
      const text = finalResponse.text();

      return text || 'Desculpe, não consegui processar sua solicitação.';
    } catch (error: any) {
      logger.error({ error }, 'Gemini service error');

      if (error.message?.includes('quota')) {
        return 'Desculpe, atingimos o limite de requisições. Tente novamente em alguns instantes.';
      }

      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }
}
