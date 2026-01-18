# MCP (Model Context Protocol) Setup for Mappin

This document describes how to configure MCP access for Supabase and n8n in Cursor, similar to the "antigravity" project setup.

## Overview

MCP (Model Context Protocol) allows Cursor AI to directly interact with your Supabase database and n8n workflows, enabling:
- Query Supabase tables directly
- Inspect database schemas
- Trigger n8n webhooks
- Monitor n8n workflow executions

## Configuration Methods

### Method 1: Cursor Settings UI (Recommended)

1. Open Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Navigate to **Features** → **MCP**
3. Add the following MCP servers:

#### Supabase MCP Server

```json
{
  "name": "supabase-mappin",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres"
  ],
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://postgres.efvxuustmbfbkckkftxi:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
  }
}
```

**Note**: Replace `[YOUR_PASSWORD]` with your Supabase database password. You can find it in Supabase Dashboard → Settings → Database.

#### n8n MCP Server (HTTP-based)

```json
{
  "name": "n8n-mappin",
  "command": "node",
  "args": [
    "./scripts/mcp-n8n-server.js"
  ],
  "env": {
    "N8N_URL": "http://localhost:5678",
    "N8N_WEBHOOK_BASE": "http://localhost:5678/webhook",
    "N8N_API_KEY": ""
  }
}
```

### Method 2: Environment Variables

Create a `.env.mcp` file in the project root (add to `.gitignore`):

```env
# Supabase MCP
SUPABASE_URL=https://efvxuustmbfbkckkftxi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh1dXN0bWJmYmtja2tmdHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjk0NTYsImV4cCI6MjA4MzgwNTQ1Nn0.R5HvrTa8ox6IiIeIiFk8KxD13SW4O8kRwgwVUj9IWpk
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh1dXN0bWJmYmtja2tmdHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIyOTQ1NiwiZXhwIjoyMDgzODA1NDU2fQ.gmyZEnpGO1fSwpI_M7dIRYAuKUvb0lZaYmdl-S4G7os

# n8n MCP
N8N_URL=http://localhost:5678
N8N_WEBHOOK_BASE=http://localhost:5678/webhook
```

## Available MCP Tools

Once configured, the AI can use these capabilities:

### Supabase Tools
- `query_conflicts` - Query the conflicts table
- `get_conflict_by_id` - Get a specific conflict
- `count_conflicts` - Count conflicts by category/date
- `schema_info` - Get table schemas

### n8n Tools
- `trigger_webhook` - Trigger n8n webhooks
- `list_workflows` - List available workflows
- `get_workflow_status` - Check workflow execution status

## Quick Start

1. **Get Supabase Database Password**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project: `efvxuustmbfbkckkftxi`
   - Go to Settings → Database
   - Copy the connection string or password

2. **Verify n8n is Running**:
   ```bash
   curl http://localhost:5678/healthz
   ```

3. **Add MCP Servers in Cursor**:
   - Open Cursor Settings → Features → MCP
   - Add the configurations above
   - Restart Cursor

4. **Test Access**:
   Ask the AI: "How many conflicts are in the database?" or "Trigger the n8n ingest workflow"

## Security Notes

- ⚠️ The Supabase Service Role Key has full admin access - use with caution
- Never commit `.env.mcp` or MCP configuration files with credentials
- Use environment variables in production deployments
- Consider using the Anon Key for read-only operations where possible

## Troubleshooting

### MCP Server Not Connecting
- Check if the database password is correct
- Verify Supabase connection string format
- Ensure n8n is running on `localhost:5678`

### Permission Errors
- Verify RLS (Row Level Security) policies in Supabase
- Check if using Service Role Key for admin operations
- Ensure API keys are not expired

### n8n Webhook Issues
- Verify workflow is in "Active" mode (not "Test" mode)
- Check webhook URL: `/webhook/[name]` (active) vs `/webhook-test/[name]` (test)
- Ensure n8n is accessible from your machine

## Example Queries

Once MCP is configured, you can ask:

```
"Show me the latest 10 conflicts from Supabase"
"Count conflicts by category"
"Check the status of the n8n ingest workflow"
"Trigger the n8n webhook for manual ingestion"
```

## Reference

- [MCP Documentation](https://modelcontextprotocol.io)
- [Supabase Postgres MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
- [Cursor MCP Setup Guide](https://docs.cursor.com/mcp)
