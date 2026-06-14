const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    let email = 'admin' + Date.now() + '@example.com';
    let testUserRes = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Admin',
        email: email,
        password: 'password123',
        role: 'student'
      })
    });
    let testUserData = await testUserRes.json();

    // Remove super_admin, use 'admin'
    await client.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);

    // re-login
    let loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: 'password123' })
    });
    let loginData = await loginRes.json();
    let token = loginData.data.token;

    console.log('Got token, fetching /admin/dashboard...');
    let res = await fetch('http://localhost:5000/api/v1/admin/dashboard?range=6m', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(data).substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
