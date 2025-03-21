function init() {
    const w = 800;
    const h = 500;
    const padding = 60;

    // Load the data from the CSV file
    d3.csv("WATER_RESOURCES.csv", function(d) {
        return {
            year: +d.TIME_PERIOD, // Convert year to numeric value
            value: +d.OBS_VALUE * Math.pow(10, +d.UNIT_MULT) // Scale value using UNIT_MULT
        };
    }).then(function(data) {
        // Preprocess the data: Group into 5-year intervals and calculate averages
        const groupedData = d3.rollups(
            data,
            v => d3.mean(v, d => d.value), // Calculate mean of scaled values
            d => Math.floor(d.year / 5) * 5 // Group by 5-year intervals
        ).map(([year, value]) => ({ year: year, value: value }));

        // Ensure sorted data and fill in missing intervals with 0
        const minYear = d3.min(groupedData, d => d.year);
        const maxYear = d3.max(groupedData, d => d.year);
        const allYears = d3.range(minYear, maxYear + 1, 5);
        const completeData = allYears.map(year => {
            const found = groupedData.find(d => d.year === year);
            return found ? found : { year: year, value: 0 };
        });

        console.table(completeData, ["year", "value"]);
        drawLineChart(w, h, completeData);
    });

    // Function to create the line chart
    function drawLineChart(w, h, dataset) {
        // Define scales for x and y axes
        const xScale = d3.scaleLinear()
            .domain(d3.extent(dataset, d => d.year))
            .range([padding, w - padding]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(dataset, d => d.value)])
            .range([h - padding, padding]);

        // Define line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value));

        // Create SVG container
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

        // Draw the line
        svg.append("path")
            .datum(dataset)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add points for each 5-year interval
        svg.selectAll("circle")
            .data(dataset)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.value))
            .attr("r", 4)
            .attr("fill", "steelblue");

        // Create x-axis
        const xAxis = d3.axisBottom(xScale)
            .tickValues(dataset.map(d => d.year)) // Only show ticks at 5-year intervals
            .tickFormat(d3.format("d"));

        svg.append("g")
            .attr("transform", `translate(0,${h - padding})`)
            .call(xAxis);

        // Create y-axis
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => `${d / 1e9}B`); // Format values as billions

        svg.append("g")
            .attr("transform", `translate(${padding},0)`)
            .call(yAxis);

        // Add chart title
        svg.append("text")
            .attr("x", w / 2)
            .attr("y", padding / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "24px")
            .attr("font-weight", "bold")
            .text("Average Freshwater Resources of every OECD countries (5-Year Intervals)");
    }
}

window.onload = init;
