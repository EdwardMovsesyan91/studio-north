// Brand/location constants only; opening hours are fetched from the API.
export const business = {
  name: 'Studio North',
  location: { city: 'Portland', region: 'Oregon', country: 'USA' },
  timezone: 'America/Los_Angeles',
  currency: 'USD',
} as const;

export const businessLocation = `${business.location.city}, ${business.location.region}, ${business.location.country}`;
