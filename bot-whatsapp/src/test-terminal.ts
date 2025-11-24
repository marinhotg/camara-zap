import 'dotenv/config';
import * as readline from 'readline';
import { MCPClient } from './mcp-client.js';
import { GeminiService } from './gemini.js';

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY não encontrada no .env');
        process.exit(1);
    }

    console.log('\n🚀 Chat Terminal - Gemini + MCP Câmara dos Deputados\n');

    console.log('📡 Iniciando MCP server...');
    const mcpClient = new MCPClient();
    await mcpClient.start();

    const geminiService = new GeminiService(apiKey, mcpClient);
    console.log('🤖 Gemini service inicializado\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Sistema pronto! Digite suas perguntas.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Exemplos:');
    console.log('  • "Quem é o deputado 220593?"');
    console.log('  • "Liste as últimas votações"');
    console.log('  • "Busque proposições sobre educação"\n');
    console.log('Digite "sair" para encerrar.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (text: string): Promise<string> => {
        return new Promise((resolve) => rl.question(text, resolve));
    };

    let running = true;

    const cleanup = async () => {
        if (running) {
            running = false;
            console.log('\n\n👋 Encerrando...');
            rl.close();
            await mcpClient.stop();
            process.exit(0);
        }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    while (running) {
        try {
            const userInput = await question('\n💬 Você: ');

            if (!userInput.trim()) {
                continue;
            }

            if (userInput.toLowerCase() === 'sair') {
                await cleanup();
                break;
            }

            console.log('\n🤖 Gemini: [processando...]\n');

            const response = await geminiService.chat(userInput);

            console.log('🤖 Gemini:', response);
        } catch (error: any) {
            if (error.code === 'ERR_USE_AFTER_CLOSE') {
                break;
            }
            console.error('\n❌ Erro:', error.message);
        }
    }
}

main().catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
