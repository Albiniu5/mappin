-- Verify no duplicates remain, then apply unique constraint
-- Run this in Supabase SQL Editor

-- Step 1: Check for any remaining duplicates
SELECT source_url, COUNT(*) as count
FROM conflicts
WHERE source_url IS NOT NULL
GROUP BY source_url
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- If the above query returns NO results, proceed with Step 2
-- Step 2: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS conflicts_source_url_unique 
ON conflicts(source_url) 
WHERE source_url IS NOT NULL;
