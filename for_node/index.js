import express from 'express';
import initSqlJs from 'sql.js';

async function queryDatabase() {
  const SQL = await initSqlJs();
  const response = await fetch('/water_resources_data.db');
  const buffer = await response.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(buffer));

  const results = db.exec('SELECT * FROM your_table');
  console.log(results);
}

queryDatabase();import fs from 'fs';

const app = express();
// Serve static files from the "public" directory
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/data', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data.html'));
});

app.get('/document', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'document.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/data2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data2.html'));
});

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'public', 'data.json');
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const jsonData = JSON.parse(rawData);


  const results = jsonData.filter(item => item.someCondition);
  res.status(200).json(results);
}



app.get('/data/geojson', (req, res) => {
  const geojsonPath = path.join(__dirname, 'custom.geo.json');
  // console.log('GeoJSON Path:', geojsonPath);
  fs.readFile(geojsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading GeoJSON file:', err);
      res.status(500).send('Error reading GeoJSON file');
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});


const db = new sqlite3.Database('./water_resources_data.db');

app.get('/api/abstraction-data', (req, res) => {
  const sql = `
    SELECT 
      FLOOR(TIME_PERIOD / 5) * 5 AS year_group, 
      AVG(OBS_VALUE) AS avg_value
    FROM 
      water_abstraction_data
    GROUP BY 
      year_group
    ORDER BY 
      year_group;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => ({
        year: row.year_group,
        value: row.avg_value
      })));
    }
  });
});


app.get('/api/resource-data', (req, res) => {
  const sql = `
    WITH RECURSIVE year_groups AS (
      SELECT MIN(FLOOR(TIME_PERIOD / 5) * 5) AS year_group
      FROM water_resources_data
      UNION ALL
      SELECT year_group + 5
      FROM year_groups
      WHERE year_group + 5 <= (SELECT MAX(FLOOR(TIME_PERIOD / 5) * 5) FROM water_resources_data)
    ),

    scaled_data AS (
      SELECT 
        FLOOR(time_period / 5) * 5 AS year_group,
        obs_value * 1000000000 AS scaled_value 
      FROM water_resources_data
    )

    SELECT 
      yg.year_group,
      COALESCE(AVG(sd.scaled_value), 0) AS avg_value
    FROM 
      year_groups yg
    LEFT JOIN 
      scaled_data sd
    ON 
      yg.year_group = sd.year_group
    GROUP BY 
      yg.year_group
    ORDER BY 
      yg.year_group;
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => ({
        year: row.year_group,
        value: row.avg_value
      })));
    }
  });
});

app.get('/usage-efficiency/:year', (req, res) => {
  const year = parseInt(req.params.year, 10);
  const sql = `
    WITH RankedResources AS (
      SELECT 
        abstraction.REF_AREA AS reference_area,
        abstraction.TIME_PERIOD AS time_period,
        abstraction.OBS_VALUE AS abstraction_value,
        resources.OBS_VALUE AS resources_value,
        resources.measure AS resources_measure,
        ROW_NUMBER() OVER (
          PARTITION BY abstraction.REF_AREA, abstraction.TIME_PERIOD
          ORDER BY 
            CASE 
              WHEN resources.measure = 'Internal resources' THEN 1
            END
        ) AS rank
      FROM 
        water_abstraction_data AS abstraction
      LEFT JOIN 
        water_resources_data AS resources
      ON 
        abstraction.REF_AREA = resources.REF_AREA 
        AND abstraction.TIME_PERIOD = resources.TIME_PERIOD
    )

    , UsageEfficiency AS (
      SELECT 
        reference_area,
        time_period,
        abstraction_value,
        resources_value,
        resources_measure,
        CASE 
          WHEN resources_value IS NULL OR resources_value = 0 THEN NULL
          ELSE abstraction_value / (resources_value * 1000)
        END AS usage_efficiency
      FROM 
        RankedResources
      WHERE 
        rank = 1
    )

    SELECT 
      reference_area,
      (time_period / 5) * 5 AS time_period_group,
      AVG(usage_efficiency) AS avg_usage_efficiency,
      AVG(abstraction_value) AS avg_abstraction_value,
      AVG(resources_value) AS avg_resources_value
    FROM 
      UsageEfficiency
    WHERE 
      time_period = ? 
    GROUP BY 
      reference_area, time_period_group
    ORDER BY 
      reference_area, time_period_group;
  `;

  db.all(sql, [year], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve abstraction data' });
      return;
    }

    // console.log('Query Result:', rows);
    res.json(rows);
  });
});


app.get('/sector-data/:year/:countryCode', (req, res) => {
  const year = parseInt(req.params.year, 10);
  const countryCode = req.params.countryCode;

  const sql = `
      WITH grouped_data AS (
        SELECT 
            measure AS sector, 
            (TIME_PERIOD / 5) * 5 AS time_period_group, 
            OBS_VALUE,
            REF_AREA
        FROM 
            water_abstraction_data
        WHERE 
            REF_AREA = ? 
            AND NOT measure = 'Total gross freshawater abstractions' 
    )
    SELECT 
        sector, 
        time_period_group, 
        AVG(OBS_VALUE) AS avg_abstraction, 
        SUM(COALESCE(OBS_VALUE, 0)) AS total_abstraction
    FROM 
        grouped_data
    WHERE 
        time_period_group = ? 
    GROUP BY 
        sector, time_period_group
    ORDER BY 
        total_abstraction DESC;

  `;

  db.all(sql, [countryCode, year], (err, rows) => {
      if (err) {
          console.error('Database error:', err.message);
          res.status(500).json({ error: 'Failed to retrieve sector data' });
          return;
      }
      console.log("Query Results:", rows);

      res.json(rows); 
  });
});



let countryNameMapping = {};

fs.readFile(path.join(__dirname, 'custom.geo.json'), 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading GeoJSON file:', err);
    return;
  }
  const geoData = JSON.parse(data);
  geoData.features.forEach(feature => {
    const isoCode = feature.properties.iso_a3;
    const countryName = feature.properties.name || feature.properties.name_long;
    countryNameMapping[isoCode] = countryName;
  });
});

app.get('/api/country-names', (req, res) => {
  res.json(countryNameMapping);
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


