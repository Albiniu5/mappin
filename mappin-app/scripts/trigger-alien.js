console.log('🛸 Triggering Alien Ingestion...');

fetch('http://localhost:3000/api/ingest-alien')
    .then(res => res.json())
    .then(data => {
        console.log('✅ Ingestion result:', data);
        if (data.success) {
            console.log(`👽 Successfully ingested ${data.processed} alien reports! (Errors: ${data.errors})`);
        } else {
            console.log('ℹ️ No new reports processed.');
        }
    })
    .catch(err => {
        console.error('❌ Error triggering ingestion (Check if server is running):', err);
    });
