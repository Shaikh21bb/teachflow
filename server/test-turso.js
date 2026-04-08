const { createClient } = require('@libsql/client');
const url = "libsql://teachflow-shaikh21bb.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQyNTY3NTYsImlkIjoiMDE5ZDE5ZjAtNmEwMS03OWJlLThiMzEtZWEyYjIwNGY3YjRjIiwicmlkIjoiY2JkNjU3NWMtOTM1Zi00NmYyLTkxNzEtOWI1YjMxZGQ1OTY1In0.3Q9Pvi87WsNVSqDEccVTV07c9d4XwYCgKp4Awnll-nqlPFnWiZYEIeml3XnHAjXgI5g2qBfwrB0xtT9O-Bh3Bw";

async function test() {
    const db = createClient({ url, authToken });
    const result = await db.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 5");
    console.log("Users in Turso DB:", result.rows.length);
    if(result.rows.length > 0) {
        console.log("Latest user:", result.rows[0]);
    }
}
test().catch(console.error);
