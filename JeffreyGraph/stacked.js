function init() {
    const w = 1200; // Chart width
    const h = 800; // Chart height
    const padding = 150; // Padding for axes and legend
    const segmentGap = 3; // Wider gap between bar segments
    const borderWidth = 1; // Border width for each segment

    // Load the data from the CSV file
    d3.csv("OECD.ENV.EPI,DSD_WATER_ABSTRACT@DF_WATER_ABSTRACT,1.0+.A.TOTAL.M3_PS.TOTAL_ABSTRACT.csv", function (d) {
        return {
            country: d.REF_AREA, // Country abbreviation
            fullName: d["Reference area"], // Full country name
            year: Math.floor(+d.TIME_PERIOD / 10) * 10, // Group years into 10-year intervals
            value: +d.OBS_VALUE, // Value of water abstraction
        };
    }).then(function (data) {
        // Define allYears explicitly to include up to 2020
        const allYears = d3.range(1970, 2021, 10);

        // Preprocess data: Group by country and 10-year interval
        const groupedData = d3.rollups(
            data,
            v => ({
                total: d3.sum(v, d => d.value), // Sum values for each group
                fullName: v[0].fullName, // Use the full country name
            }),
            d => d.country, // Group by country
            d => d.year // Further group by 10-year interval
        );

        // Flatten grouped data into a format suitable for a stacked bar chart
        const flatData = groupedData.map(([country, yearsData]) => {
            const row = { country: country, fullName: yearsData[0][1].fullName }; // Include full country name
            allYears.forEach(year => {
                const yearData = yearsData.find(([y]) => y === year);
                row[year] = yearData ? yearData[1].total : 0; // Include year, set value to 0 if missing
            });
            return row;
        });

        drawStackedBarChart(flatData, allYears, w, h, padding, segmentGap, borderWidth);
    });

    function drawStackedBarChart(dataset, years, w, h, padding, segmentGap, borderWidth) {
        // Sort countries by total abstraction value (highest to lowest)
        const countries = dataset
            .sort((a, b) => {
                const totalA = d3.sum(years, year => a[year] || 0);
                const totalB = d3.sum(years, year => b[year] || 0);
                return totalB - totalA; // Descending order by total abstraction
            })
            .map(d => d.country); // Extract ordered country abbreviations

        // Define scales
        const xScale = d3.scaleBand()
            .domain(countries)
            .range([padding, w - padding])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(dataset, d => d3.sum(years, year => d[year] || 0)) * 1.1]) // Add 10% margin above max value
            .range([h - padding, padding]);

        // Updated custom blue palette
        const customBlues = [
            "#08306b", // Dark blue
            "#08519c",
            "#2171b5",
            "#4292c6",
            "#6baed6",
            "#9ecae1",
            "#bdd7e7", // Light blue but not white
        ];
        const colorScale = d3.scaleOrdinal(customBlues).domain(years);

        // Create SVG container
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

        // Add gridlines for Y-axis
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(${padding},0)`)
            .call(
                d3.axisLeft(yScale)
                    .tickSize(-w + 2 * padding)
                    .tickFormat("")
            )
            .selectAll("line")
            .attr("stroke", "#e0e0e0");

        // Stack data
        const stack = d3.stack().keys(years);
        const stackedData = stack(dataset);

        // Tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("padding", "8px")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 2px 5px rgba(0,0,0,0.2)")
            .style("visibility", "hidden");

        // Add groups for each stack layer
        svg.selectAll("g.stack")
            .data(stackedData)
            .enter()
            .append("g")
            .attr("class", "stack")
            .attr("fill", d => colorScale(d.key)) // Color based on 10-year interval
            .selectAll("rect")
            .data(d => d)
            .enter()
            .append("rect")
            .attr("x", d => xScale(d.data.country)) // Use abbreviations for x-axis
            .attr("y", d => yScale(d[1]) + segmentGap) // Add gap to the y-position
            .attr("height", d => Math.max(0, yScale(d[0]) - yScale(d[1]) - segmentGap)) // Subtract gap from height
            .attr("width", xScale.bandwidth() - borderWidth) // Account for border
            .style("stroke", "#666") // Add a light gray border
            .style("stroke-width", `${borderWidth}px`)
            .on("mouseover", function (event, d) {
                const year = event.target.parentNode.__data__.key; // Get the 10-year interval
                const value = d[1] - d[0]; // Segment value
                const total = d3.sum(years, y => d.data[y] || 0); // Total abstraction for the bar
                const percentage = ((value / total) * 100).toFixed(2); // Calculate percentage
                const countryFullName = d.data.fullName; // Full country name from the dataset

                tooltip.style("visibility", "visible")
                    .html(` 
                        <strong>Country:</strong> ${countryFullName}<br>
                        <strong>Year Interval:</strong> ${year}<br>
                        <strong>Value:</strong> ${Math.round(value)}<br>
                        <strong>Percentage:</strong> ${percentage}% 
                    `)
                    .style("top", `${event.pageY - 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", `${event.pageY - 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });

        // Add axes
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("transform", `translate(0,${h - padding})`)
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        const yAxis = d3.axisLeft(yScale).tickFormat(d => `${d / 1e3}K`);
        svg.append("g")
            .attr("transform", `translate(${padding},0)`)
            .call(yAxis);

        // Add chart title
        svg.append("text")
            .attr("x", w / 2)
            .attr("y", padding / 3)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Water Abstraction by Country Up to 2020 (10-Year Intervals)");

        // Add Legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${padding},${padding / 2})`);

        years.forEach((year, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(${i * 100}, 0)`);

            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(year));

            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(year)
                .attr("font-size", "12px")
                .attr("fill", "black");
        });
    }
}

window.onload = init;
