import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const year = parseInt(req.query.year, 10);
    const countryCode = req.query.countryCode;

    if (isNaN(year) || !countryCode) {
      res.status(400).json({ error: 'Invalid year or countryCode parameter' });
      return;
    }

    const abstractionPath = path.join(process.cwd(), 'public', '/datasets/water_abstraction_data.json');

    const abstractionData = JSON.parse(await fs.readFile(abstractionPath, 'utf-8'));

    const UNIT_MULT = 6;

    const filteredData = abstractionData.filter(item => {
      if (!item.REF_AREA || !item.time_period) return false;
      return (
        item.REF_AREA === countryCode &&
        Math.floor(item.time_period / 5) * 5 === Math.floor(year / 5) * 5
      );
    });

    if (filteredData.length === 0) {
      res.status(404).json({ error: 'No data found for the specified year and country' });
      return;
    }

    const filteredWithoutTotal = filteredData.filter(item => {
      return !item.measure.toLowerCase().includes('total');
    });

    if (filteredWithoutTotal.length === 0) {
      res.status(404).json({ error: 'No data available after excluding totals' });
      return;
    }

    const sectorData = filteredWithoutTotal.reduce((acc, curr) => {
      const adjustedValue = curr.obs_value * Math.pow(10, UNIT_MULT); 

      const existing = acc.find(item => item.sector === curr.measure);
      if (existing) {
        existing.total_abstraction += adjustedValue || 0;
        existing.count += 1;
        existing.avg_abstraction = existing.total_abstraction / existing.count;
      } else {
        acc.push({
          sector: curr.measure,
          time_period_group: Math.floor(curr.time_period / 5) * 5,
          avg_abstraction: adjustedValue || 0,
          total_abstraction: adjustedValue || 0,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.status(200).json(sectorData);
  } catch (error) {
    console.error('Error processing sector data:', error);
    res.status(500).json({ error: 'Failed to retrieve sector data', details: error.message });
  }
}
