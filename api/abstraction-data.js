import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const abstractionPath = path.join(process.cwd(), 'public', '/datasets/water_abstraction_data.json');

    const abstractionData = JSON.parse(await fs.readFile(abstractionPath, 'utf-8'));

    const groupedData = abstractionData.reduce((acc, curr) => {
      const yearGroup = Math.floor(curr.time_period / 5) * 5; 

      if (!acc[yearGroup]) {
        acc[yearGroup] = [];
      }

      const adjustedValue = (curr.obs_value || 0) * 1e6;

      acc[yearGroup].push(adjustedValue);
      return acc;
    }, {});

    const result = Object.entries(groupedData).map(([yearGroup, values]) => ({
      year: parseInt(yearGroup, 10),
      value: values.reduce((sum, val) => sum + val, 0) / values.length,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing abstraction data:', error);
    res.status(500).json({ error: 'Failed to retrieve abstraction data', details: error.message });
  }
}
