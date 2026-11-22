import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'http://localhost:3000';
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/vehicles`, lastModified: new Date() },
    { url: `${base}/booking`, lastModified: new Date() },
    { url: `${base}/marketplace`, lastModified: new Date() },
    { url: `${base}/wholesale`, lastModified: new Date() },
  ];
}
