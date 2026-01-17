# Server Maintenance Guide

If your 40GB disk is full, it's almost certainly **Docker**. Docker loves to eat disk space with old images, build caches, and logs.

## 1. How to Check Disk Space

Once you are logged into your server (via SSH or Coolify Terminal):

### Check Overall Usage
```bash
df -h
```
Look for the line mounted on `/` (usually the first one). If `Use%` is **90% - 100%**, your disk is full.

### Check Docker Usage
```bash
docker system df
```
This shows how much space Images, Containers, and Build Cache are using.

---

## 2. How to Free Up Space (The Fix)

Run these commands in order.

### A. The "Safe" Cleanup (Recommended)
Removes stopped containers, unused networks, and dangling images.
```bash
docker system prune -f
```

### B. The "Deep" Cleanup (If still full)
**WARNING:** This removes ALL unused images, not just dangling ones. It will force Coolify to re-download/re-build images next time, but it recovers the most space.
```bash
docker system prune -a -f --volumes
```

### C. Check for Large Files (Logs)
Sometimes a log file goes rogue & grows to 20GB. Find the biggest folders:
```bash
du -ah / | sort -rh | head -n 20
```

## 3. Why is 40GB Full?
1.  **Old Deployments:** Every time you deploy updates (like we did 10 times today), Coolify typically builds a *new* Docker image. The old ones hang around until deleted.
2.  **Build Cache:** `npm install` and build steps create temporary files that stay cached to make future builds faster.
3.  **Logs:** If an app is error-looping (like our 404 error earlier), it can write millions of log lines in minutes.
