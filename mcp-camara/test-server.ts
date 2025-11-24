import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testServer() {
  console.log('🚀 Iniciando teste do MCP Server Câmara dos Deputados...\n');

  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log('✅ Conectado ao servidor MCP\n');

    const tools = await client.listTools();
    console.log(`📋 Tools disponíveis: ${tools.tools.length}\n`);

    tools.tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   ${tool.description}\n`);
    });

    console.log('🔍 Testando: deputados_list (primeiros 5 deputados)...\n');
    const result = await client.callTool({
      name: 'deputados_list',
      arguments: {},
    });

    const data = JSON.parse(result.content[0].text);
    if (data.dados && Array.isArray(data.dados)) {
      console.log(`✅ Sucesso! Retornou ${data.dados.length} deputados`);
      console.log('\nPrimeiros 3 deputados:');
      data.dados.slice(0, 3).forEach((dep: any, i: number) => {
        console.log(`  ${i + 1}. ${dep.nome} (${dep.siglaPartido}/${dep.siglaUf})`);
      });
    } else {
      console.log('❌ Formato inesperado:', data);
    }

    console.log('\n✅ Teste concluído com sucesso!');
    await client.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testServer();
