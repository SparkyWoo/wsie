const axios = require('axios');

const BACKEND_URL = 'https://restaurant-recommender-backend-dbc8baa02796.herokuapp.com';

module.exports = async (req, res) => {
  console.log('Received request:', req.method, req.url);
  console.log('Request body:', req.body);

  if (req.method === 'OPTIONS') {
    // Handle preflight request
    res.status(200).end();
    return;
  }

  try {
    let response;
    if (req.method === 'GET' && req.url.startsWith('/api/yelp-search')) {
      console.log('Sending Yelp search request to backend:', `${BACKEND_URL}${req.url}`);
      response = await axios.get(`${BACKEND_URL}${req.url}`, {
        params: req.query,
        timeout: 10000, // 10 seconds timeout
      });
    } else if (req.method === 'POST' && req.url === '/api/proxy') {
      console.log('Sending recommendation request to backend:', `${BACKEND_URL}/api/recommendations`);
      response = await axios.post(`${BACKEND_URL}/api/recommendations`, req.body, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout
      });
    } else if (req.method === 'POST' && req.url === '/api/summarize') {
      console.log('Sending summarize request to backend:', `${BACKEND_URL}/api/summarize`);
      response = await axios.post(`${BACKEND_URL}/api/summarize`, req.body, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout
      });
    } else {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    console.log('Received response from backend:', response.status, response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      console.error('Backend response:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.error('No response received from backend');
      res.status(504).json({ error: 'Backend timeout' });
    } else {
      console.error('Error setting up request:', error.message);
      res.status(500).json({ error: 'Proxy configuration error' });
    }
  }
};