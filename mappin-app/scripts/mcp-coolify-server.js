#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const COOLIFY_URL = process.env.COOLIFY_URL || 'http://77.42.91.174:8000';
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN || '';
const PROJECT_ID = process.env.COOLIFY_PROJECT_ID || 'isccg0wscksc844o4sgcoo40';
const APPLICATION_ID = process.env.COOLIFY_APPLICATION_ID || 's4c0c084goks00ccsk880s44';

const server = new Server(
  {
    name: 'coolify-mappin',
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
      name: 'get_deployment_status',
      description: 'Get the current deployment status for the Mappin application',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'trigger_deployment',
      description: 'Trigger a new deployment for the Mappin application',
      inputSchema: {
        type: 'object',
        properties: {
          force: {
            type: 'boolean',
            description: 'Force deployment even if no changes detected',
          },
        },
      },
    },
    {
      name: 'get_application_logs',
      description: 'Get recent application logs from Coolify',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of log lines to retrieve (default: 100)',
          },
        },
      },
    },
    {
      name: 'check_application_health',
      description: 'Check if the Mappin application is running and healthy',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

async function coolifyRequest(endpoint, method = 'GET', body = null) {
  const url = `${COOLIFY_URL}/api/v1${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (COOLIFY_API_TOKEN) {
    headers['Authorization'] = `Bearer ${COOLIFY_API_TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    };
  } catch (error) {
    throw new Error(`Coolify API request failed: ${error.message}`);
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_deployment_status') {
    try {
      const result = await coolifyRequest(
        `/projects/${PROJECT_ID}/applications/${APPLICATION_ID}/deployments`
      );

      if (result.status === 200 && Array.isArray(result.data) && result.data.length > 0) {
        const latest = result.data[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: latest.status || 'unknown',
                createdAt: latest.created_at,
                updatedAt: latest.updated_at,
                deploymentId: latest.uuid,
                message: latest.status_message || 'No message',
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}\n\nNote: Coolify API token may be required. Get it from Coolify Settings → API Tokens.`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'trigger_deployment') {
    try {
      const { force = false } = args || {};
      const result = await coolifyRequest(
        `/projects/${PROJECT_ID}/applications/${APPLICATION_ID}/deploy`,
        'POST',
        { force }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: result.status === 200 || result.status === 201,
              status: result.status,
              message: result.data?.message || 'Deployment triggered',
              data: result.data,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}\n\nNote: Coolify API token is required for triggering deployments.`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'get_application_logs') {
    try {
      const { lines = 100 } = args || {};
      const result = await coolifyRequest(
        `/projects/${PROJECT_ID}/applications/${APPLICATION_ID}/logs?lines=${lines}`
      );

      return {
        content: [
          {
            type: 'text',
            text: result.data?.logs || JSON.stringify(result, null, 2),
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

  if (name === 'check_application_health') {
    try {
      // Check if the application URL is accessible
      const appUrl = 'http://s4c0c084goks00ccsk880s44.77.42.91.174.sslip.io';
      const response = await fetch(appUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: response.ok,
              status: response.status,
              statusText: response.statusText,
              url: appUrl,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: false,
              error: error.message,
            }, null, 2),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Coolify MCP server running on stdio');
}

main().catch(console.error);
