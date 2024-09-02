import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import RestaurantRecommender from './RestaurantRecommender';
import './styles.css';

function App() {
  return (
    <>
      <RestaurantRecommender />
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;