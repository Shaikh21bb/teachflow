const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzUqJ0f4iosSX1jQALMQyQbLTFK3_x2BAq5zQfnbGalLf73R8GBuAEV4iNtOXtt5sqz/exec';
async function test() {
    try {
        console.log("Sending...");
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ name: 'Test', email: 'test@example.com', action: 'Регистрация', created_at: new Date().toISOString() }),
            headers: { 'Content-Type': 'text/plain' }
        });
        const text = await response.text();
        console.log("Webhook Response:", text);
    } catch(e) {
        console.error("Fetch failed:", e);
    }
}
test();
