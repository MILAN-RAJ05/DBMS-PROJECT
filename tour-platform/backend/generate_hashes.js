const bcrypt = require('bcryptjs');

const generateHash = async (password) => {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
};

const passwords = ['admin1', 'admin12', 'admin123'];

const run = async () => {
  console.log('Generating bcrypt hashes for admin passwords...');
  const hashes = await Promise.all(passwords.map(generateHash));
  
  hashes.forEach((hash, index) => {
    console.log(`Password for admin${index + 1}: ${passwords[index]}`);
    console.log(`Hash: ${hash}\n`);
  });
};

run();
