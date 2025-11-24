#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fetchCamaraAPI } from './api.js';

const server = new Server(
  {
    name: 'camara-deputados',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'deputados_list',
        description: 'Lista deputados com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'IDs dos deputados',
            },
            nome: {
              type: 'array',
              items: { type: 'string' },
              description: 'Nomes dos deputados',
            },
            idLegislatura: {
              type: 'array',
              items: { type: 'number' },
              description: 'IDs das legislaturas',
            },
            siglaUf: {
              type: 'array',
              items: { type: 'string' },
              description: 'Siglas das UFs',
            },
            siglaPartido: {
              type: 'array',
              items: { type: 'string' },
              description: 'Siglas dos partidos',
            },
          },
        },
      },
      {
        name: 'deputados_get',
        description: 'Obtém detalhes de um deputado específico',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do deputado',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'deputados_discursos',
        description: 'Lista discursos de um deputado',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do deputado',
            },
            idLegislatura: {
              type: 'number',
              description: 'ID da legislatura',
            },
            dataInicio: {
              type: 'string',
              description: 'Data de início (AAAA-MM-DD)',
            },
            dataFim: {
              type: 'string',
              description: 'Data de fim (AAAA-MM-DD)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'deputados_mandatos',
        description: 'Lista mandatos externos de um deputado',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do deputado',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'deputados_ocupacoes',
        description: 'Lista ocupações de um deputado',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do deputado',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'proposicoes_list',
        description: 'Lista proposições com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'IDs das proposições',
            },
            siglaTipo: {
              type: 'array',
              items: { type: 'string' },
              description: 'Siglas dos tipos de proposição',
            },
            numero: {
              type: 'number',
              description: 'Número da proposição',
            },
            ano: {
              type: 'number',
              description: 'Ano da proposição',
            },
            dataInicio: {
              type: 'string',
              description: 'Data de início (AAAA-MM-DD)',
            },
            dataFim: {
              type: 'string',
              description: 'Data de fim (AAAA-MM-DD)',
            },
            idAutor: {
              type: 'number',
              description: 'ID do autor',
            },
            autor: {
              type: 'string',
              description: 'Nome do autor',
            },
            siglaPartidoAutor: {
              type: 'string',
              description: 'Sigla do partido do autor',
            },
            idPartidoAutor: {
              type: 'number',
              description: 'ID do partido do autor',
            },
            siglaUfAutor: {
              type: 'string',
              description: 'Sigla da UF do autor',
            },
            keywords: {
              type: 'string',
              description: 'Palavras-chave para busca',
            },
            tramitacaoSenado: {
              type: 'boolean',
              description: 'Filtrar por tramitação no Senado',
            },
          },
        },
      },
      {
        name: 'proposicoes_get',
        description: 'Obtém detalhes de uma proposição específica',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID da proposição',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'proposicoes_votacoes',
        description: 'Lista votações de uma proposição',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID da proposição',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'votacoes_list',
        description: 'Lista votações com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs das votações',
            },
            idProposicao: {
              type: 'number',
              description: 'ID da proposição',
            },
            idEvento: {
              type: 'number',
              description: 'ID do evento',
            },
            idOrgao: {
              type: 'number',
              description: 'ID do órgão',
            },
            dataInicio: {
              type: 'string',
              description: 'Data de início (AAAA-MM-DD)',
            },
            dataFim: {
              type: 'string',
              description: 'Data de fim (AAAA-MM-DD)',
            },
          },
        },
      },
      {
        name: 'votacoes_get',
        description: 'Obtém detalhes de uma votação específica',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID da votação',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'votacoes_votos',
        description: 'Lista votos de uma votação',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID da votação',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'legislaturas_list',
        description: 'Lista legislaturas com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID da legislatura',
            },
            data: {
              type: 'string',
              description: 'Data de referência (AAAA-MM-DD)',
            },
          },
        },
      },
      {
        name: 'legislaturas_get',
        description: 'Obtém detalhes de uma legislatura específica',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID da legislatura',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'eventos_list',
        description: 'Lista eventos com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'IDs dos eventos',
            },
            dataInicio: {
              type: 'string',
              description: 'Data de início (AAAA-MM-DD)',
            },
            dataFim: {
              type: 'string',
              description: 'Data de fim (AAAA-MM-DD)',
            },
          },
        },
      },
      {
        name: 'eventos_get',
        description: 'Obtém detalhes de um evento específico',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do evento',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'eventos_votacoes',
        description: 'Lista votações de um evento',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID do evento',
            },
          },
          required: ['id'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'deputados_list': {
        const result = await fetchCamaraAPI('/deputados', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'deputados_get': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/deputados/${id}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'deputados_discursos': {
        const { id, ...queryParams } = args as {
          id: number;
          idLegislatura?: number;
          dataInicio?: string;
          dataFim?: string;
        };
        const result = await fetchCamaraAPI(
          `/deputados/${id}/discursos`,
          queryParams
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'deputados_mandatos': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/deputados/${id}/mandatosExternos`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'deputados_ocupacoes': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/deputados/${id}/ocupacoes`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'proposicoes_list': {
        const result = await fetchCamaraAPI('/proposicoes', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'proposicoes_get': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/proposicoes/${id}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'proposicoes_votacoes': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/proposicoes/${id}/votacoes`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'votacoes_list': {
        const result = await fetchCamaraAPI('/votacoes', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'votacoes_get': {
        const { id } = args as { id: string };
        const result = await fetchCamaraAPI(`/votacoes/${id}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'votacoes_votos': {
        const { id } = args as { id: string };
        const result = await fetchCamaraAPI(`/votacoes/${id}/votos`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'legislaturas_list': {
        const result = await fetchCamaraAPI('/legislaturas', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'legislaturas_get': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/legislaturas/${id}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'eventos_list': {
        const result = await fetchCamaraAPI('/eventos', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'eventos_get': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/eventos/${id}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'eventos_votacoes': {
        const { id } = args as { id: number };
        const result = await fetchCamaraAPI(`/eventos/${id}/votacoes`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Tool desconhecida: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              isError: true,
              error: error.message || 'Erro desconhecido',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
