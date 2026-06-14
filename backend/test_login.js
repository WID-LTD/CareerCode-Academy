require('dotenv').config();

async function login() {
  try {
    let email = 'admin@careercode.com'; 
    let res = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: 'password123' })
    });
    console.log(await res.json());
  } catch (err) {
    console.error(err);
  }
}
login();
