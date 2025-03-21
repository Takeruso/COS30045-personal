import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const resourcePath = path.join(process.cwd(), 'public', '/datasets/water_resources_data.json');

    const resourceData = JSON.parse(await fs.readFile(resourcePath, 'utf-8'));

    const groupedData = resourceData.reduce((acc, curr) => {
      const yearGroup = Math.floor(curr.time_period / 5) * 5;
      if (!acc[yearGroup]) {
        acc[yearGroup] = [];
      }
      acc[yearGroup].push(curr.obs_value || 0);
      return acc;
    }, {});

    const result = Object.entries(groupedData).map(([yearGroup, values]) => ({
      year: parseInt(yearGroup, 10),
      value: values.reduce((sum, val) => sum + val, 0) / values.length,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing resource data:', error);
    res.status(500).json({ error: 'Failed to retrieve resource data' });
  }
}
