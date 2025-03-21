// script.js
async function fetchWaterUseData() {
    try {
        const response = await fetch('/api/water-use'); 
        const data = await response.json();

        const dataList = document.getElementById('data-list');
        data.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.year} - ${item.sector}: ${item.usage_amount}`;
            dataList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

window.onload = fetchWaterUseData;
