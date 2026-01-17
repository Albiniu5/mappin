console.log('🛸 Triggering Alien Ingestion...');

fetch('http://localhost:3000/api/ingest-alien')
    .then(res => res.json())
    .then(data => {
        console.log('✅ Ingestion result:', data);
        if (data.success && data.processed > 0) {
            console.log(`👽 Successfully ingested ${data.processed} alien reports successfully!`);
        } else {
            console.log('ℹ️ No new reports processed (duplicates or rate limits).');
        }
    })
    .catch(err => {
        console.error('❌ Error triggering ingestion:', err);
    });
