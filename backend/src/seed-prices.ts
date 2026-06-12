import dotenv from 'dotenv';
dotenv.config();

import { query } from './config/db';

const priceMap: Record<string, number> = {
  'python-for-everybody': 5000,
  'machine-learning': 10000,
  'data-structures-algorithms': 8500,
  'full-stack-web-development': 12000,
  'database-systems-sql': 7500,
  'computer-networks-security': 7500,
  'cloud-computing-with-aws': 10000,
  'artificial-intelligence': 12500,
  'software-engineering-design-patterns': 8500,
  'cybersecurity': 10000,
};

async function updatePrices() {
  try {
    console.log('=== Updating Course Prices ===\n');

    for (const [slug, price] of Object.entries(priceMap)) {
      await query(
        'UPDATE courses SET price = $1 WHERE slug = $2',
        [price, slug]
      );
      console.log(`  ${slug.padEnd(40)} → ₦${price.toLocaleString()}`);
    }

    const { rows } = await query('SELECT COUNT(*) as count, ROUND(AVG(price)) as avg, MIN(price) as min, MAX(price) as max FROM courses WHERE published = true');
    console.log(`\n=== Summary ===`);
    console.log(`  Total courses: ${rows[0].count}`);
    console.log(`  Price range:   ₦${rows[0].min} – ₦${rows[0].max}`);
    console.log(`  Average price:  ₦${rows[0].avg}`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to update prices:', error);
    process.exit(1);
  }
}

updatePrices();
