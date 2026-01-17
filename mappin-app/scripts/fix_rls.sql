-- Enable RLS (if not already)
alter table conflicts enable row level security;

-- Allow anonymous inserts (for development/demo purposes)
create policy "Enable insert for anon" 
on conflicts 
for insert 
with check (true);

-- Allow anonymous reads (so the map can fetch data)
-- (This might already exist, but good to ensure)
create policy "Enable select for anon" 
on conflicts 
for select 
using (true);

-- ALTERNATIVE (SIMPLER FOR DEV):
-- alter table conflicts disable row level security;
