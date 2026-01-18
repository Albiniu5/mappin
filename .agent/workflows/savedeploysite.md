---
description: Save changes and deploy the site
---

# Save and Deploy Workflow

This workflow saves all changes to git and deploys the application.

## Steps

1. **Check git status**
```bash
git status
```

2. **Stage all changes**
```bash
git add .
```

3. **Commit changes**
```bash
git commit -m "UI refinements: bottom control bar redesign, consistent button styling"
```

4. **Push to repository**
```bash
git push
```

5. **Verify deployment**
- Check Vercel/Coolify dashboard for deployment status
- Visit the live site to confirm changes are deployed

## Notes
- Ensure all changes are tested locally before deploying
- Version should be bumped if this is a release
- Check deployment logs if any issues occur
