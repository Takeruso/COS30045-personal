function init() {
    const w = 1200; // Chart width
    const h = 800; // Chart height
    const padding = 150; // Padding for axes and legend
    const segmentGap = 3; // Wider gap between bar segments
    const borderWidth = 1; // Border width for each segment

    // APIエンドポイントからデータを取得
    fetch('/api/sector-averave-data.js')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            return response.json();
        })
        .then(data => {
            // データの整形
            const allYears = d3.range(1970, 2021, 5); // 5年ごとの区切り
            const processedData = preprocessData(data, allYears);

            // 初期グラフ描画
            drawStackedBarChart(processedData, allYears, w, h, padding, segmentGap, borderWidth);

            // タイムスライダーを追加
            addTimeSlider(processedData, allYears, w, h, padding, segmentGap, borderWidth);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

function preprocessData(data, allYears) {
    // データを5年ごとの区切りに整形
    return d3.rollups(
        data,
        v => ({
            total: d3.sum(v, d => d.abstraction_value),
            fullName: v[0].reference_area,
        }),
        d => d.reference_area, // 国ごとにグループ化
        d => Math.floor(d.time_period / 5) * 5 // 5年区切りでグループ化
    ).map(([country, yearsData]) => {
        const row = { country: country, fullName: yearsData[0][1].fullName };
        allYears.forEach(year => {
            const yearData = yearsData.find(([y]) => y === year);
            row[year] = yearData ? yearData[1].total : 0; // 該当するデータがなければ0をセット
        });
        return row;
    });
}

function drawStackedBarChart(dataset, years, w, h, padding, segmentGap, borderWidth, filterYear = null) {
    // フィルタされた年だけを描画
    const filteredYears = filterYear ? [filterYear] : years;

    // データをソート（抽出量の合計値で降順）
    const countries = dataset
        .sort((a, b) => {
            const totalA = d3.sum(filteredYears, year => a[year] || 0);
            const totalB = d3.sum(filteredYears, year => b[year] || 0);
            return totalB - totalA;
        })
        .map(d => d.country);

    // スケール定義
    const xScale = d3.scaleBand()
        .domain(countries)
        .range([padding, w - padding])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(dataset, d => d3.sum(filteredYears, year => d[year] || 0)) * 1.1])
        .range([h - padding, padding]);

    // カスタムパレット
    const customBlues = [
        "#08306b", "#08519c", "#2171b5",
        "#4292c6", "#6baed6", "#9ecae1", "#bdd7e7"
    ];
    const colorScale = d3.scaleOrdinal(customBlues).domain(filteredYears);

    // SVG初期化
    let svg = d3.select("#chart svg");
    if (svg.empty()) {
        svg = d3.select("#chart")
            .append("svg")
            .attr("width", w)
            .attr("height", h);
    } else {
        svg.selectAll("*").remove();
    }

    // Y軸グリッドライン
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

    // スタックデータ生成
    const stack = d3.stack().keys(filteredYears);
    const stackedData = stack(dataset);

    // スタックグループ作成
    svg.selectAll("g.stack")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "stack")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.data.country))
        .attr("y", d => yScale(d[1]) + segmentGap)
        .attr("height", d => Math.max(0, yScale(d[0]) - yScale(d[1]) - segmentGap))
        .attr("width", xScale.bandwidth() - borderWidth)
        .style("stroke", "#666")
        .style("stroke-width", `${borderWidth}px`);

    // X軸とY軸
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

    // グラフタイトル
    svg.append("text")
        .attr("x", w / 2)
        .attr("y", padding / 3)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(filterYear ? `Water Abstraction (${filterYear})` : "Water Abstraction by Country (All Years)");
}

function addTimeSlider(dataset, years, w, h, padding, segmentGap, borderWidth) {
    const sliderContainer = d3.select("#chart")
        .append("div")
        .attr("id", "slider-container")
        .style("margin", "20px")
        .style("text-align", "center");

    sliderContainer.append("label")
        .text("Select Year:")
        .style("margin-right", "10px");

    sliderContainer.append("input")
        .attr("type", "range")
        .attr("min", d3.min(years))
        .attr("max", d3.max(years))
        .attr("step", 5)
        .attr("value", d3.min(years))
        .on("input", function () {
            const selectedYear = +this.value;
            drawStackedBarChart(dataset, years, w, h, padding, segmentGap, borderWidth, selectedYear);
        });
}

window.onload = init;
