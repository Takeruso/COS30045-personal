import sqlite3 from 'sqlite3';
import fs from 'fs';

const db = new sqlite3.Database('water_resources_data.db');

db.all("SELECT * FROM water_resources_data", [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    fs.writeFileSync('water_resources_data.json', JSON.stringify(rows, null, 2));
    console.log('Data exported to data.json');
});

db.all("SELECT * FROM water_abstraction_data", [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    fs.writeFileSync('water_abstraction_data.json', JSON.stringify(rows, null, 2));
    console.log('Data exported to data.json');
});


db.close();
