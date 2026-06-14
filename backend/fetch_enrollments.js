require('dotenv').config();

async function test() {
  try {
    let loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', password: 'password123' })
    });
    let loginData = await loginRes.json();

    let token = '';
    if (loginRes.ok && loginData.data && loginData.data.token) {
      token = loginData.data.token;
    } else {
      let testUserRes = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Student',
          email: 'test' + Date.now() + '@example.com',
          password: 'password123',
          role: 'student'
        })
      });
      let testUserData = await testUserRes.json();
      if (testUserData.data) {
          token = testUserData.data.token;
      }
    }

    if (!token) {
      console.log('Could not get token');
      return;
    }

    console.log('Got token, fetching /enrollments...');
    let res = await fetch('http://localhost:5000/api/v1/enrollments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
