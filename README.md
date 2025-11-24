# CâmaraZap

O CâmaraZap é um assistente legislativo inteligente no WhatsApp que simplifica e explica projetos de lei, votações, discursos e gastos públicos. Ele consulta diretamente a API dos Dados Abertos da Câmara via MCP Server e usa IA para resumir, interpretar e traduzir linguagem jurídica em explicações práticas, acessíveis e personalizadas ao cidadão.

## Tecnologias

- Node.js + TypeScript
- Google Gemini 2.5 Flash
- WhatsApp (Baileys)
- MCP (Model Context Protocol)
- API Dados Abertos da Câmara

## Como Rodar

### Pré-requisitos

- Node.js 18+
- Conta Google Cloud com API Key do Gemini

### Instalação

1. Clone o repositório e instale as dependências:

```bash
cd mcp-camara
npm install
npm run build

cd ../bot-whatsapp
npm install
npm run build
```

2. Configure a API Key do Gemini:

```bash
cd bot-whatsapp
echo "GEMINI_API_KEY=sua-chave-aqui" > .env
```

3. Inicie o bot:

```bash
npm start
```

4. Escaneie o QR Code que aparecerá no terminal com seu WhatsApp

5. Envie uma mensagem para o número conectado, exemplo:
   - "Qual é o ID do deputado Nikolas Ferreira?"
   - "Qual foi o último discurso dele?"

## Funcionalidades

- Busca informações sobre deputados
- Consulta discursos e votações
- Lista proposições e eventos
- Interpreta datas em português ("hoje", "ontem", "última semana")
- Mantém contexto da conversa
- Respostas concisas e naturais
