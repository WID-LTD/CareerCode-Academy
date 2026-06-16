async function run() {
  const usersToTest = [
    { email: 'admin@careercode.com', password: 'password' },
    { email: 'student_test_100@careercode.com', password: 'Password123!' },
    { email: 'test@test.com', password: 'password' },
  ];

  for (const u of usersToTest) {
    console.log(`Sending POST /api/v1/auth/login for ${u.email}...`);
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(u),
      });

      const data = await res.json();
      console.log(`Response Status: ${res.status}`);
      console.log('Response Body:', data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    console.log('-'.repeat(40));
  }
}

run();
