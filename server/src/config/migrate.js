const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const runMigration = async () => {
  try {
    console.log('⏳ Reading migration file...');
    const sqlPath = path.join(__dirname, '../../../001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Running migration against Neon PostgreSQL...');
    await pool.query(sql);
    console.log('✅ Database migration successful!');
  } catch (err) {
    console.error('❌ Database migration failed:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

runMigration();
