import 'dotenv/config';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    WAMessage,
    MessageUpsertType
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { pino } from 'pino';
import qrcode from 'qrcode-terminal';
import { MCPClient } from './mcp-client.js';
import { GeminiService } from './gemini.js';

const logger = pino({ level: 'error' });

const mcpClient = new MCPClient();
let geminiService: GeminiService;
const userContext = new Map<string, { lastResponse: string; lastQuery: string }>();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        browser: ['Bot Câmara', 'Desktop', '1.0.0'],
        logger,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n========== QR CODE ==========\n');
            qrcode.generate(qr, { small: true });
            console.log('\n========== ESCANEIE ACIMA ==========\n');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`\n❌ Conexão fechada (código: ${statusCode})`);

            if (shouldReconnect) {
                console.log('🔄 Reconectando em 5 segundos...\n');
                setTimeout(() => startBot(), 5000);
            } else {
                console.error('❌ Desconectado. Delete auth_info_baileys e reinicie.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('\n✅ Conectado ao WhatsApp com sucesso!');
            console.log('🤖 Bot pronto para receber mensagens!\n');
        }
    });

    sock.ev.on('messages.upsert', async (m: { messages: WAMessage[], type: MessageUpsertType }) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                const sender = msg.key.remoteJid;
                const isGroup = sender?.endsWith('@g.us');

                if (isGroup) continue;

                const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

                if (text && sender) {
                    console.log(`\n📨 Mensagem de ${sender}:
`);
                    console.log(`   "${text}"`);

                    try {
                        await sock.sendPresenceUpdate('composing', sender);

                        let messageToSend = text;
                        const context = userContext.get(sender);

                        if (context && context.lastResponse) {
                             messageToSend = `[CONTEXTO DA CONVERSA ANTERIOR]\nResposta do Bot: "${context.lastResponse}"\nPergunta do Usuário: "${context.lastQuery}"\n\n[MENSAGEM ATUAL]\n"${text}"`;
                        }

                        const response = await geminiService.chat(messageToSend);

                        userContext.set(sender, { lastResponse: response, lastQuery: text });

                        await sock.sendPresenceUpdate('paused', sender);

                        await sock.sendMessage(sender, { text: response });

                        console.log(`✅ Resposta enviada\n`);
                    } catch (error: any) {
                        console.error(`❌ Erro: ${error.message}`);
                        await sock.sendMessage(sender, {
                            text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
                        });
                    }
                }
            }
        }
    });
}

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY não encontrada no .env');
        process.exit(1);
    }

    console.log('🚀 Iniciando Bot WhatsApp + Gemini + MCP Câmara...\n');

    console.log('📡 Iniciando MCP server...');
    await mcpClient.start();

    geminiService = new GeminiService(apiKey, mcpClient);
    console.log('🤖 Gemini service inicializado\n');

    console.log('📱 Aguardando QR Code...\n');

    await startBot();
}

process.on('SIGINT', async () => {
    console.log('\n\n👋 Encerrando bot...');
    await mcpClient.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n👋 Encerrando bot...');
    await mcpClient.stop();
    process.exit(0);
});

main();