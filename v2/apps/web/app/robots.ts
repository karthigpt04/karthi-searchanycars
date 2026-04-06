import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/change-password',
          '/my-bookings',
        ],
      },
    ],
    sitemap: 'https://searchanycars.com/sitemap.xml',
  };
}
