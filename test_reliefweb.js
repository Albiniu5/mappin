// Native fetch in Node 18+

async function testReliefWeb() {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    // ReliefWeb API likely rejects milliseconds. Format: YYYY-MM-DDTHH:MM:SSZ
    const dateStr = fiveYearsAgo.toISOString().split('.')[0] + '+00:00';

    const params = new URLSearchParams([
        ['appname', 'rwint-user-0'],
        ['profile', 'list'],
        ['preset', 'latest'],
        ['limit', '10'],
        ['offset', '0'],
        ['query[value]', 'conflict OR war OR attack OR military OR violence'], // Use query for text search
        ['filter[field]', 'date.created'],
        ['filter[value][from]', dateStr],
        // ['filter[operator]', '>='], // Removed invalid operator
        ['fields[include][]', 'title'],
        ['fields[include][]', 'body'],
        ['fields[include][]', 'url'],
        ['fields[include][]', 'date'],
        ['fields[include][]', 'primary_country']
    ]);

    // Simulating the fix for duplicate keys string replacement
    const url = `https://api.reliefweb.int/v1/reports?${params.toString().replace(/%5B%5D=/g, '[]=')}`;

    console.log("Fetching URL:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Full Response:", JSON.stringify(data, null, 2));

        if (data.data && data.data.length > 0) {
            console.log("First item:", data.data[0].fields.title);
            console.log("First item country:", data.data[0].fields.primary_country);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

testReliefWeb();
