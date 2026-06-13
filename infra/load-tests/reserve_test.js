import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 },    // Ramp up
        { duration: '1m', target: 200 },    // Sustain target
        { duration: '30s', target: 0 },     // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],   // 95% under 500ms
        http_req_failed: ['rate<0.01'],     // Less than 1% errors
    },
};

const BASE_URL = 'http://localhost:8000';

export default function () {
    const payload = JSON.stringify({
        category_id: '99999999-9999-9999-9999-999999999999',
        quantity: 1,
        buyer_name: `Test User ${__VU}`,
        buyer_phone: `2547${Math.floor(100000000 + Math.random() * 900000000)}`,
        buyer_email: `test${__VU}@otiko.com`,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/api/orders/reserve`, payload, params);
    
    check(res, {
        'status is 200, 409 or 429': (r) => r.status === 200 || r.status === 409 || r.status === 429,
    });
    
    sleep(0.1);
}
