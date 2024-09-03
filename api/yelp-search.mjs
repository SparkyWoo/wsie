import axios from 'axios';

const YELP_API_KEY = process.env.YELP_API_KEY;

export default async function handler(req, res) {
  const { name, address } = req.query;
  
  if (!YELP_API_KEY) {
    console.error('Yelp API key is not set');
    return res.status(500).json({ error: 'Yelp API key is not set' });
  }

  try {
    console.log(`Searching for: ${name} at ${address}`);
    const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
      params: { term: name, location: address, limit: 1 },
      headers: { Authorization: `Bearer ${YELP_API_KEY}` }
    });
    
    const business = response.data.businesses[0];
    if (business) {
      console.log(`Found business: ${business.name}`);
      res.status(200).json({ yelpUrl: business.url });
    } else {
      console.log('No matching business found');
      res.status(404).json({ error: 'No matching business found' });
    }
  } catch (error) {
    console.error('Yelp search error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Failed to fetch Yelp URL', 
      details: error.response ? error.response.data : error.message 
    });
  }
}