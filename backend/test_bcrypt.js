const bcrypt = require('bcryptjs');

async function test() {
  const hash = '$2a$12$vIamOpEVPH2PgHubpJsqEewLoDs23RaA23qXLW7frQl/ZrI9IC6RO';
  const isMatch = await bcrypt.compare('password123', hash);
  console.log('Match?', isMatch);
}
test();
