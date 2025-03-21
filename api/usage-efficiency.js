import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
      res.status(400).json({ error: 'Invalid year parameter' });
      return;
    }

    console.time("Data Load");

    const abstractionPath = path.join(process.cwd(), 'public', '/datasets/water_abstraction_data.json');
    const resourcesPath = path.join(process.cwd(), 'public', '/datasets/water_resources_data.json');

    const abstractionData = JSON.parse(await fs.readFile(abstractionPath, 'utf-8'));
    const resourcesData = JSON.parse(await fs.readFile(resourcesPath, 'utf-8'));

    console.timeEnd("Data Load");

    console.time("Data Processing");

    const yearGroup = Math.floor(year / 5) * 5;

    const UNIT_MULT_ABSTRACTION = 6;
    const UNIT_MULT_RESOURCES = 9;

    // Filter abstractionData to exclude unwanted countries and invalid OBS_VALUE
    const excludedCountries = ["ARG", "ARM", "AZE", "BGR", "BLR", "BRA", "CHN", "CRI", "GEO", "HRV", "RUS", "SAU", "IND", "PER", "UKR", "ROU", "ZAF", "MDA"];

    const filteredAbstractionData = abstractionData.filter(
      item =>
        Math.floor(item.time_period / 5) * 5 === yearGroup && 
        !excludedCountries.includes(item.REF_AREA) &&         
        item.obs_value !== null &&                           
        item.obs_value !== 0                                 
    );

    const filteredResourcesData = resourcesData.filter(
      item =>
        !excludedCountries.includes(item.REF_AREA) &&         
        item.obs_value !== null &&                        
        item.obs_value !== 0                                
    );

    // Update rankedResourcesMap with filteredResourcesData
    const rankedResourcesMap = new Map();
    filteredResourcesData
      .sort((a, b) => {
        if (a.measure === "Internal resources") return -1;
        if (b.measure === "Internal resources") return 1;
        return 0;
      })
      .forEach(resource => {
        const key = `${resource.REF_AREA}-${resource.time_period}`;
        if (!rankedResourcesMap.has(key)) {
          rankedResourcesMap.set(key, resource);
        }
      });

    const rankedResources = filteredAbstractionData.map(abstraction => {
      const key = `${abstraction.REF_AREA}-${abstraction.time_period}`;
      const resource = rankedResourcesMap.get(key);

      const abstractionValue = abstraction.obs_value
        ? abstraction.obs_value * Math.pow(10, UNIT_MULT_ABSTRACTION)
        : 0;

      const resourceValue = resource && resource.obs_value
        ? resource.obs_value * Math.pow(10, UNIT_MULT_RESOURCES)
        : 0;

      if (!resource) {
        console.warn(`No resource data found for key: ${key}`);
      }

      const usageEfficiency = resourceValue > 0 ? abstractionValue / resourceValue : null;

      return {
        reference_area: abstraction.REF_AREA,
        time_period: abstraction.time_period,
        abstraction_value: abstractionValue,
        resources_value: resourceValue,
        resources_measure: resource ? resource.measure : null,
        usage_efficiency: usageEfficiency
      };
    });

    const groupedData = rankedResources.reduce((acc, curr) => {
      const groupKey = `${curr.reference_area}-${yearGroup}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          reference_area: curr.reference_area,
          time_period_group: yearGroup,
          total_usage_efficiency: 0,
          total_abstraction_value: 0,
          total_resources_value: 0,
          count: 0
        };
      }

      if (curr.usage_efficiency !== null) {
        acc[groupKey].total_usage_efficiency += curr.usage_efficiency;
        acc[groupKey].count += 1;
      }

      acc[groupKey].total_abstraction_value += curr.abstraction_value || 0;
      acc[groupKey].total_resources_value += curr.resources_value || 0;

      if (curr.resources_value === 0) {
        console.warn(`Invalid resource value for ${curr.reference_area} in ${curr.time_period}`);
      }

      return acc;
    }, {});


    const finalData = Object.values(groupedData).map(item => ({
      reference_area: item.reference_area,
      time_period_group: item.time_period_group,
      avg_usage_efficiency: item.count > 0 ? item.total_usage_efficiency / item.count : null,
      avg_abstraction_value: item.total_abstraction_value / (item.count || 1),
      avg_resources_value: item.total_resources_value / (item.count || 1)
    }));

    console.timeEnd("Data Processing");

    console.time("Response Send");
    res.status(200).json(finalData);
    console.timeEnd("Response Send");
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process data', details: error.message });
  }
}
