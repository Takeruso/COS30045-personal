import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const geojsonPath = path.join(process.cwd(), 'public', '/datasets/custom.geo.json');

    const data = await fs.readFile(geojsonPath, 'utf8');

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(data);
  } catch (err) {
    console.error('Error reading GeoJSON file:', err);
    res.status(500).json({ error: 'Error reading GeoJSON file' });
  }
}
