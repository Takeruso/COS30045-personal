const db = require('./db'); 

// getting data
db.all('SELECT * FROM water_use_data', (err, rows) => {
  if (err) {
    console.error('Error of getting data: ', err.message);
  } else {
    console.log('Get data:', rows);
  }
});
