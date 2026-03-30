const axios = require('axios');

const API_TOKEN = 'Qk9WQzRSQnpjamVCe2pnXURpbl91kJZkaE9ihHWGUHiDk3FmWJZm';
const BASE_URL = 'http://147.135.212.197/crapi/time/viewstats';

function extractOTP(message) {
    if (!message) return null;
    let match = message.match(/(\d{3,4})[- ](\d{3,4})/);
    if (match) return match[1] + match[2];
    match = message.match(/\b(\d{4,6})\b/);
    if (match) return match[1];
    match = message.match(/OTP[:\s]*(\d{4,6})/i);
    if (match) return match[1];
    return null;
}

async function getNumbers(countryCode = null) {
    try {
        const response = await axios.get(BASE_URL, {
            params: { token: API_TOKEN },
            timeout: 10000
        });
        const records = response.data.data || [];
        const numbers = [...new Set(records.map(r => r.num))];
        if (countryCode) {
            return numbers.filter(n => n.startsWith(countryCode));
        }
        return numbers;
    } catch (err) {
        console.log('Numbers error:', err.message);
        return [];
    }
}

async function getLiveOTP(countryCode = null) {
    try {
        const response = await axios.get(BASE_URL, {
            params: { token: API_TOKEN },
            timeout: 10000
        });
        const records = response.data.data || [];
        const numberMap = new Map();
        for (const record of records) {
            const num = record.num;
            if (countryCode && !num.startsWith(countryCode)) continue;
            const otp = extractOTP(record.message);
            if (!otp) continue;
            if (!numberMap.has(num) || new Date(record.dt) > new Date(numberMap.get(num).time)) {
                numberMap.set(num, {
                    number: num,
                    otp: otp,
                    service: record.cli || 'Unknown',
                    time: record.dt
                });
            }
        }
        return Array.from(numberMap.values());
    } catch (err) {
        console.log('OTP error:', err.message);
        return [];
    }
}

module.exports = async (req, res) => {
    const { path, country } = req.query;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (path === 'activenumbers') {
        const numbers = await getNumbers(country);
        return res.json({ result: numbers });
    }
    
    if (path === 'liveotp') {
        const otps = await getLiveOTP(country);
        return res.json({ result: otps });
    }
    
    return res.json({
        error: 'Invalid path',
        available: ['activenumbers', 'liveotp'],
        example: '/api?path=activenumbers&country=92'
    });
};
