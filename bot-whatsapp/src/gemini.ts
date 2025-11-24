import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { MCPClient } from './mcp-client.js';
import { pino } from 'pino';

const logger = pino({ level: 'info' });

function processNaturalLanguage(message: string): string {
  const today = new Date();
  let processedMessage = message;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastMonthStart = new Date(today);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  processedMessage = processedMessage
    .replace(/\bhoje\b/gi, formatDate(today))
    .replace(/\bontem\b/gi, formatDate(yesterday))
    .replace(/última semana|ultima semana/gi, `desde ${formatDate(lastWeekStart)}`)
    .replace(/último mês|ultimo mes/gi, `desde ${formatDate(lastMonthStart)}`)
    .replace(/últimos 6 meses|ultimos 6 meses/gi, `desde ${formatDate(sixMonthsAgo)}`);

  processedMessage = processedMessage.replace(
    /\b(\d{2})\/(\d{2})\/(\d{4})\b/g,
    (_, day, month, year) => `${year}-${month}-${day}`
  );

  if (/último.*discurso|ultimo.*discurso|mais recente|discurso.*recente/i.test(message)) {
    processedMessage += `\n[CONTEXTO: Usuário quer o discurso MAIS RECENTE. Use dataInicio=${formatDate(sixMonthsAgo)} para buscar nos últimos 6 meses e retorne APENAS o mais recente ordenado por data.]`;
  }

  return processedMessage;
}

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
      const processedMessage = processNaturalLanguage(userMessage);

      const mcpTools = await this.mcpClient.listTools();
      const geminiTools = this.convertMCPToolsToGemini(mcpTools);

      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ functionDeclarations: geminiTools }],
        systemInstruction:
          'Você é um assistente que ajuda eleitores brasileiros a acompanharem votações na Câmara dos Deputados.\n\n' +
          'INSTRUÇÕES IMPORTANTES:\n' +
          '1. Seja CONCISO - responda em no máximo 2-3 frases quando possível\n' +
          '2. Quando o usuário pedir "último discurso" ou "mais recente", você DEVE buscar SEM exigir data. Use um período amplo recente (ex: últimos 6 meses)\n' +
          '3. Se a busca sem data não retornar resultados, ENTÃO sugira períodos alternativos ou pergunte a data\n' +
          '4. Aceite datas em formato brasileiro (DD/MM/AAAA) e converta para AAAA-MM-DD internamente\n' +
          '5. Interprete "hoje", "ontem", "última semana", "último mês" automaticamente\n' +
          '6. Use as funções disponíveis para buscar informações atualizadas\n' +
          '7. NUNCA peça informação que você já tem do contexto da conversa anterior\n\n' +
          'Responda de forma clara, direta e objetiva em português.',
      });

      const chat = this.model.startChat();
      let result = await chat.sendMessage(processedMessage);

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
      logger.error({ error: error.message, stack: error.stack }, 'Gemini service error');
      console.error('Erro detalhado do Gemini:', error);

      if (error.message?.includes('quota')) {
        return 'Desculpe, atingimos o limite de requisições. Tente novamente em alguns instantes.';
      }

      if (error.message?.includes('API key')) {
        return 'Erro de autenticação com o Gemini. Verifique a API key.';
      }

      return `Desculpe, ocorreu um erro: ${error.message}`;
    }
  }
}
