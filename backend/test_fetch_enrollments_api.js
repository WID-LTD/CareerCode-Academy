require('dotenv').config();

async function test() {
  try {
    let email = 'emmach793@gmail.com'; 
    let loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: 'password123' })
    });
    let loginData = await loginRes.json();
    let token = loginData.data.token;

    console.log('Got token for', email);
    
    let res = await fetch('http://localhost:5000/api/v1/enrollments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      let data = await res.json();
      console.log('Response status:', res.status);
      console.log('Enrollments data:', JSON.stringify(data).substring(0, 500));
    } else {
      console.log('Response status:', res.status);
      console.log('Response text:', await res.text());
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
