import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import './RestaurantRecommender.css';

const API_URL = '/api/proxy';
const SUMMARIZE_URL = '/api/summarize';
const YELP_SEARCH_URL = '/api/yelp-search';

function RestaurantRecommender() {
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(async (value) => {
    if (value.length > 2) {
      setIsLoading(true);
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
          params: {
            q: value,
            format: 'json',
            limit: 10,
            countrycodes: 'us',
            addressdetails: 1
          }
        });
        
        const uniqueSuggestions = response.data
          .filter(item => item.address && (item.address.city || item.address.postcode))
          .map(item => {
            const city = item.address.city || item.address.town || item.address.village || '';
            const state = item.address.state || '';
            const postcode = item.address.postcode || '';
            let label = '';
            let value = '';

            if (city && state) {
              label = `${city}, ${state}`;
              value = `${city}, ${state}`;
            } else if (postcode) {
              label = `${postcode}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`;
              value = postcode;
            }

            return { label, value, importance: item.importance };
          })
          .filter((item, index, self) => 
            index === self.findIndex((t) => t.label === item.label)
          )
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 5);

        setSuggestions(uniqueSuggestions);
        setShowSuggestions(uniqueSuggestions.length > 0);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const debouncedFetchSuggestions = useCallback((value) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300); // 300ms delay
  }, [fetchSuggestions]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecommendations([]);

    console.log(`Submitting request for "${keywords}" in "${location}"`);

    try {
      console.log('Sending request to:', API_URL);
      const response = await axios.post(API_URL, { location, keywords }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // Increase timeout to 60 seconds
      });
      console.log('Raw response:', response);
      console.log('Response data:', response.data);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        setRecommendations(response.data);
      } else {
        setError('No recommendations found. Please try different keywords or location.');
      }
    } catch (error) {
      console.error('Error details:', error);
      if (error.response) {
        console.error('Error response:', error.response);
        setError('An error occurred while fetching recommendations. Please try again.');
      } else if (error.request) {
        console.error('Error request:', error.request);
        setError('Unable to reach the server. Please check your internet connection and try again.');
      } else {
        console.error('Error message:', error.message);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    debouncedFetchSuggestions(value);
  };

  const handleSuggestionClick = (suggestion) => {
    setLocation(suggestion.value);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="restaurant-recommender">
      <header className="header">
        <img src="/images/wsie-logo.png" alt="WSIE Logo" className="wsie-logo" />
      </header>

      <form onSubmit={onSubmit} className="search-form">
        <div className="input-group" ref={suggestionRef}>
          <input
            type="text"
            value={location}
            onChange={handleLocationChange}
            placeholder="Enter location"
            required
          />
          <i className="fas fa-map-marker-alt"></i>
          {isLoading && <div className="loading-indicator">Loading...</div>}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-item"
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="input-group">
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Enter food type"
            required
          />
          <i className="fas fa-utensils"></i>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Find Restaurants'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="recommendations">
        {recommendations.map((restaurant) => (
          <RestaurantCard key={restaurant.placeId} restaurant={restaurant} />
        ))}
      </div>

      <footer>
        WSIE helps you decide where to eat.
      </footer>
    </div>
  );
}

function sanitizeUrl(url) {
  return url.replace(/^@+/, '').replace(/[@]+/g, '');
}

function RestaurantCard({ restaurant }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [yelpUrl, setYelpUrl] = useState(null);
  const [yelpError, setYelpError] = useState(null);
  const [reviewSummary, setReviewSummary] = useState('');

  useEffect(() => {
    const fetchYelpUrl = async () => {
      try {
        console.log(`Fetching Yelp URL for: ${restaurant.name} at ${restaurant.address}`);
        const response = await axios.get(YELP_SEARCH_URL, {
          params: {
            name: restaurant.name,
            address: restaurant.address,
          },
        });
        if (response.data && response.data.yelpUrl) {
          setYelpUrl(response.data.yelpUrl);
        } else {
          setYelpError('No Yelp URL found');
        }
      } catch (error) {
        console.error('Error fetching Yelp URL:', error.response ? error.response.data : error.message);
        setYelpError(error.response?.data?.error || error.message);
      }
    };

    const fetchReviewSummary = async () => {
      try {
        console.log(`Fetching review summary for: ${restaurant.name} at ${restaurant.address}`);
        const response = await axios.post(SUMMARIZE_URL, { reviewText: restaurant.reviews.join(' ') }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.data && response.data.summary) {
          setReviewSummary(response.data.summary);
        } else {
          setReviewSummary('No review summary found');
        }
      } catch (error) {
        console.error('Error fetching review summary:', error.response ? error.response.data : error.message);
        setReviewSummary(error.response?.data?.error || error.message);
      }
    };

    fetchYelpUrl();
    fetchReviewSummary();
  }, [restaurant.name, restaurant.address, restaurant.reviews]);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      (prevIndex + 1) % (restaurant.photos ? restaurant.photos.length : 1)
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      (prevIndex - 1 + (restaurant.photos ? restaurant.photos.length : 1)) % (restaurant.photos ? restaurant.photos.length : 1)
    );
  };

  const getYelpSearchUrl = (name, address) => {
    const [street, city] = address.split(',');
    const query = encodeURIComponent(`${name}`);
    const location = encodeURIComponent(city.trim());
    return `https://www.yelp.com/search?find_desc=${query}&find_loc=${location}`;
  };

  console.log("Restaurant placeId:", restaurant.placeId);

  const googleMapsUrl = sanitizeUrl(`https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`);
  console.log("Google Maps URL:", googleMapsUrl);

  return (
    <div className="restaurant-card">
      <div className="restaurant-card-content">
        <div className="restaurant-photo-container">
          {restaurant.photos && restaurant.photos.length > 0 ? (
            <>
              <img 
                src={restaurant.photos[currentPhotoIndex]} 
                alt={restaurant.name} 
                className="restaurant-photo"
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
              {restaurant.photos.length > 1 && (
                <div className="photo-navigation">
                  <button onClick={prevPhoto} className="photo-nav-button">&#8249;</button>
                  <button onClick={nextPhoto} className="photo-nav-button">&#8250;</button>
                </div>
              )}
            </>
          ) : (
            <div className="no-photo">No Image Available</div>
          )}
        </div>
        <div className="restaurant-info">
          <h2 className="restaurant-name">
            <a 
              href={googleMapsUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="restaurant-name-link"
            >
              {restaurant.name}
            </a>
          </h2>
          <p className="restaurant-address">{restaurant.address}</p>
          <div className="restaurant-rating">
            <span className="rating-stars">{'★'.repeat(Math.round(restaurant.rating))}</span>
            <span className="rating-number">{restaurant.rating.toFixed(1)}</span>
            <span className="review-count">({restaurant.reviewCount || (restaurant.reviews && restaurant.reviews.length) || 0} reviews)</span>
          </div>
          {reviewSummary && (
            <div className="review-summary">
              <p className="review-summary-text">{reviewSummary}</p>
            </div>
          )}
        </div>
      </div>
      {/* Remove the View on Google Maps button */}
    </div>
  );
}

export default RestaurantRecommender;