// Simple icon generation script
// This creates basic colored square icons for PWA functionality
// In a real project, you'd replace these with proper designed icons

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon that we can convert to different sizes
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF0080;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#00FFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFFF00;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}"/>
  <!-- Game elements -->
  <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.08}" fill="#FFFFFF"/>
  <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.08}" fill="#FFFFFF"/>
  <circle cx="${size * 0.5}" cy="${size * 0.3}" r="${size * 0.08}" fill="#FFFFFF"/>
  <!-- Player character -->
  <circle cx="${size * 0.5}" cy="${size * 0.7}" r="${size * 0.12}" fill="#4169E1"/>
  <circle cx="${size * 0.5}" cy="${size * 0.65}" r="${size * 0.06}" fill="#FFE4B5"/>
  <!-- Lightning bolt -->
  <path d="M ${size * 0.45} ${size * 0.45} L ${size * 0.55} ${size * 0.4} L ${size * 0.48} ${size * 0.52} L ${size * 0.58} ${size * 0.47} L ${size * 0.42} ${size * 0.6} L ${size * 0.52} ${size * 0.55} L ${size * 0.45} ${size * 0.45}" fill="#00FFFF" stroke="#FFFFFF" stroke-width="1"/>
</svg>
`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

const publicDir = path.join(__dirname, '..', 'public');

// Generate SVG icons for each size
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = size === 180 ? 'apple-touch-icon.svg' : `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`Generated ${filename}`);
});

console.log('Icon generation complete! 🎮');
console.log('Note: These are basic SVG icons. For production, convert to PNG and use custom designs.');