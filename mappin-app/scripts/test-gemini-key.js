require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log('--- Testing Updated Gemini API Key ---');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY not found in environment');
        return;
    }

    console.log(`🔑 Key found: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        console.log('📤 Sending test prompt...');
        const result = await model.generateContent("Say hello");
        const response = await result.response;
        const text = response.text();

        console.log('✅ SUCCESS! Gemini API is working correctly!');
        console.log('Response:', text);
    } catch (error) {
        console.error('❌ Error calling Gemini API:');
        console.error(error.message);
    }
}

testGemini();
