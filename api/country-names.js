const fs = require('fs');
const path = require('path');

let countryNameMapping = {};

export default function handler(req, res) {
  if (Object.keys(countryNameMapping).length === 0) {
    const geojsonPath = path.join(process.cwd(), '/datasets/custom.geo.json');
    const data = fs.readFileSync(geojsonPath, 'utf8');
    const geoData = JSON.parse(data);

    geoData.features.forEach(feature => {
      const isoCode = feature.properties.iso_a3;
      const countryName = feature.properties.name || feature.properties.name_long;
      countryNameMapping[isoCode] = countryName;
    });
  }

  res.json(countryNameMapping);
}
