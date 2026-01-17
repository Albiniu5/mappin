# 🔐 Mappin API Keys

## Supabase Configuration

### Project Details
- **Project URL**: `https://efvxuustmbfbkckkftxi.supabase.co`
- **Project ID**: `efvxuustmbfbkckkftxi`

### API Keys

#### Anon Key (Public)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh1dXN0bWJmYmtja2tmdHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjk0NTYsImV4cCI6MjA4MzgwNTQ1Nn0.R5HvrTa8ox6IiIeIiFk8KxD13SW4O8kRwgwVUj9IWpk
```
- **Usage**: Client-side applications (React, Next.js frontend)
- **Permissions**: Read-only access, respects Row Level Security (RLS)

#### Service Role Key (Secret - Admin Access)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh1dXN0bWJmYmtja2tmdHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIyOTQ1NiwiZXhwIjoyMDgzODA1NDU2fQ.gmyZEnpGO1fSwpI_M7dIRYAuKUvb0lZaYmdl-S4G7os
```
- **Usage**: Server-side only, admin scripts, database maintenance
- **Permissions**: Full admin access, bypasses RLS
- **⚠️ NEVER** expose this key in client-side code or public repositories

---

## Other API Keys

### Gemini API
```
AIzaSyBxy1M6i_AqiDEezTYCWqRorthYTNwqwtA
```
- **Usage**: AI processing for news categorization and geocoding
- **Note**: Rate-limited, used in n8n workflow

---

## Security Notes

1. **This file should be in `.gitignore`** - Never commit to version control
2. Service Role Key has unrestricted database access - use with extreme caution
3. Rotate keys immediately if they are ever exposed publicly
4. Store in secure environment variables for production deployments
