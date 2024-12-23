const express = require('express');
const { parse } = require('csv-parse'); // ייבוא נכון של הפונקציה parse
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/resources', express.static('resources'));

// Read Cities CSV
app.get('/api/cities', (req, res) => {
    const citiesPath = path.join(__dirname, 'resources', 'Cities.csv');
    const results = [];

    fs.createReadStream(citiesPath)
        .pipe(parse()) // שימוש בפונקציה parse
        .on('data', (data) => results.push(data))
        .on('end', () => {
            res.json(results);
        })
        .on('error', (error) => {
            res.status(500).json({ error: 'Error reading cities data' });
        });
});

// Read Cheese CSV
app.get('/api/cheese', (req, res) => {
    const cheesePath = path.join(__dirname, 'resources', 'Cheese.csv');
    const results = [];

    fs.createReadStream(cheesePath)
    .pipe(parse({ columns: true, skipBOM: true })) // Enable skipBOM
    .on('data', (data) => {
        console.log('Row:', data); // Log each row of the CSV
        results.push(data);
    })
    .on('end', () => {
        try {
            console.log('Results:', results); // Log the complete results array
            const categories = [...new Set(results.map(item => item.Category))];
            const cheeseData = categories.map(category => {
                return {
                    category: category,
                    cheeses: results
                        .filter(item => item.Category === category)
                        .map(item => ({
                            name: item.Cheese,
                            price: item.Price
                        }))
                };
            });
            console.log('Cheese Data:', cheeseData); // Log the processed data
            res.json(cheeseData);
        } catch (err) {
            console.error('Processing error:', err);
            res.status(500).json({ error: 'Error processing cheese data' });
        }
    })
    .on('error', (error) => {
        console.error('File read error:', error);
        res.status(500).json({ error: 'Error reading cheese data' });
    });
});



// Handle order submission
// Handle order submission
app.post('/api/submit-order', (req, res) => {
    const orderData = req.body;
    const ordersPath = path.join(__dirname, 'OrdersList.csv');
    
    // First, read the cheese data to get all cheese types
    const cheesePath = path.join(__dirname, 'resources', 'Cheese.csv');
    fs.readFile(cheesePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading cheese data:', err);
            return res.status(500).json({ error: 'Error reading cheese data' });
        }

        // Parse cheese CSV to get headers
        parse(data, { columns: true, skipBOM: true }, (err, cheeseRows) => {
            if (err) {
                console.error('Error parsing cheese data:', err);
                return res.status(500).json({ error: 'Error parsing cheese data' });
            }

            // Create headers if file doesn't exist
            if (!fs.existsSync(ordersPath)) {
                const baseHeaders = ['מספר הזמנה', 'שם', 'טלפון', 'תאריך הזמנה', 'עיר איסוף', 'תאריך איסוף'];
                const cheeseHeaders = cheeseRows.map(row => row.Cheese);
                const headers = [...baseHeaders, ...cheeseHeaders];
                fs.writeFileSync(ordersPath, headers.join(',') + '\n', 'utf8');
            }

            // Read existing orders to get next order number
            const orders = fs.readFileSync(ordersPath, 'utf8').split('\n');
            const orderNumber = orders.length > 1 ? orders.length : 1;
            
            // Format the order data
            const orderRow = [
                orderNumber,
                orderData.name,
                orderData.phone,
                orderData.orderDate,
                orderData.pickupCity,
                orderData.pickupDate,
                ...orderData.quantities
            ].join(',');

            // Append the new order
            fs.appendFileSync(ordersPath, orderRow + '\n', 'utf8');
            
            res.json({ success: true, orderNumber });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
