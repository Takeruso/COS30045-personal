const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const db = new sqlite3.Database('./water_resources_data.db'); 
const waterResourcesCsvPath = './WATER_RESOURCES.csv'; 
const waterAbstractionCsvPath = './WATER_ABSTRACT.csv'; 

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS water_resources_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    REF_AREA TEXT,
    time_period INTEGER,
    obs_value REAL,
    measure TEXT
  )`);

  db.run('BEGIN TRANSACTION');
  fs.createReadStream(waterResourcesCsvPath)
    .pipe(csv())
    .on('data', (row) => {
      db.run(`INSERT INTO water_resources_data (
          REF_AREA, time_period, obs_value, measure
        ) VALUES (?, ?, ?, ?)`,
        [
          row['REF_AREA'], row['TIME_PERIOD'], row['OBS_VALUE'], row['Measure']
        ],
        (err) => {
          if (err) console.error('Insert Error in water_resources_data:', err.message);
        }
      );
    })
    .on('end', () => {
      db.run('COMMIT', () => {
        console.log('water_resources_data imported');

        db.run(`CREATE TABLE IF NOT EXISTS water_abstraction_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          REF_AREA TEXT,
          time_period INTEGER,
          obs_value REAL,
          measure TEXT,
          unit_of_measure TEXT,
          water_source TEXT
        )`);

        db.run('BEGIN TRANSACTION');
        fs.createReadStream(waterAbstractionCsvPath)
          .pipe(csv())
          .on('data', (row) => {
            db.run(`INSERT INTO water_abstraction_data (
                REF_AREA, time_period, obs_value, measure, unit_of_measure, water_source
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                row['REF_AREA'], row['TIME_PERIOD'], row['OBS_VALUE'], row['Measure'], 
                row['Unit of measure'], row['Water source']
              ],
              (err) => {
                if (err) console.error('Insert Error in water_abstraction_data:', err.message);
              }
            );
          })
          .on('end', () => {
            db.run('COMMIT', () => {
              console.log('water_abstraction_data was imported');
              db.close();
            });
          });
      });
    });
});
