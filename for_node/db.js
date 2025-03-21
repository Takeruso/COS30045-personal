const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./water_resources_data.db', (err) => {
  if (err) {
    console.error('Error creating database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Run the SQL script to create tables and insert data
    const sql = fs.readFileSync('./init.sql', 'utf-8');
    db.exec(sql, (execErr) => {
      if (execErr) {
        console.error('Error executing SQL script:', execErr.message);
      } else {
        console.log('Tables and data created successfully.');
      }
    });
  }
});

module.exports = db;
