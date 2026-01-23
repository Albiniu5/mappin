#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const N8N_URL = process.env.N8N_URL || 'http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io';
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || `${N8N_URL}/webhook`;

const server = new Server(
  {
    name: 'n8n-mappin',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'trigger_webhook',
      description: 'Trigger an n8n webhook by name',
      inputSchema: {
        type: 'object',
        properties: {
          webhookName: {
            type: 'string',
            description: 'Name of the webhook (e.g., ingest-ai, ingest-live)',
          },
          data: {
            type: 'object',
            description: 'Data to send to the webhook',
          },
        },
        required: ['webhookName'],
      },
    },
    {
      name: 'list_webhooks',
      description: 'List available n8n webhooks',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'trigger_webhook') {
    const { webhookName, data = {} } = args || {};
    const url = `${N8N_WEBHOOK_BASE}/${webhookName}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              url: url,
              data: responseData,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'list_webhooks') {
    const webhooks = ['ingest-ai', 'ingest-live', 'ingest'];
    return {
      content: [
        {
          type: 'text',
          text: `Available webhooks:\n${webhooks.map(w => `- ${w}: ${N8N_WEBHOOK_BASE}/${w}`).join('\n')}\n\nBase URL: ${N8N_URL}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n MCP server running on stdio');
}

main().catch(console.error);
