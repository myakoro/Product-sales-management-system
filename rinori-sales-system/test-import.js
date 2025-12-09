const fs = require('fs');
const path = require('path');

async function run() {
    const filePath = 'C:/Users/takuy/Desktop/売上管理システム/sales_test.csv';
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/csv' });

    const formData = new FormData();
    formData.append('targetYm', '2025-10');
    formData.append('importMode', 'append');
    formData.append('file', blob, 'sales_test.csv');

    console.log('Sending import request...');
    try {
        const res = await fetch('http://localhost:3000/api/sales/import', {
            method: 'POST',
            body: formData,
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
