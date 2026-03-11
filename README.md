# 🌍 WorldGuesser - GeoGuessr Clone

A fun geography guessing game inspired by GeoGuessr! Explore random locations around the world using Google Street View and Yandex Street View (for Russia), then guess where you are on the map.

## Features

- **🗺️ Google Street View Integration** - Explore locations worldwide
- **🇷🇺 Yandex Street View Support** - Special handling for Russian locations
- **🎯 Interactive Map Guessing** - Click on the map to place your guess
- **📊 Scoring System** - Get points based on distance accuracy (max 5000 per round)
- **🏆 5 Rounds** - Test your geography knowledge across multiple locations
- **📱 Responsive Design** - Works on desktop and mobile devices

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Street View Static API
4. Create credentials (API Key)
5. Copy your API key

### 2. Configure the Game

Open `index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=streetview"></script>
```

### 3. Run the Game

Simply open `index.html` in your web browser, or use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Then open http://localhost:8000 in your browser
```

## How to Play

1. **Start Game** - Click the "Start Game" button
2. **Explore** - Look around the Street View location (pan, zoom, navigate)
3. **Make Guess** - Click "Make Guess" to open the map
4. **Place Marker** - Click on the map where you think you are
5. **Submit** - Click "Submit Guess" to see your results
6. **Review** - See the distance, points earned, and compare locations
7. **Continue** - Play through all 5 rounds
8. **Final Score** - See your total score and performance rating

## Scoring

- **Maximum per round**: 5,000 points
- **Maximum total**: 25,000 points (5 rounds × 5,000)
- Points decrease linearly with distance
- Perfect guess (< 1 km): Full 5,000 points
- Distance > 20,000 km: 0 points

## Performance Ratings

- **90%+** (22,500+ points): 🏆 Geography Master
- **70%+** (17,500+ points): 🌟 Great Job
- **50%+** (12,500+ points): 👍 Good Effort
- **30%+** (7,500+ points): 📚 Room for Improvement
- **< 30%** (< 7,500 points): 🗺️ Keep Exploring

## Russia & Yandex Integration

The game has special handling for Russian locations:
- 30% chance of getting a Russian location
- When in Russia, the game provides a direct link to Yandex Maps Street View
- This is because Google Street View coverage in Russia is limited
- For full Yandex integration, you would need to add the Yandex Maps API

## File Structure

```
/workspace
├── index.html      # Main HTML file with game structure
├── styles.css      # All styling and animations
├── game.js         # Game logic and mechanics
└── README.md       # This file
```

## Customization

You can easily customize:
- **Number of rounds**: Change `this.totalRounds = 5` in `game.js`
- **Russia probability**: Adjust `Math.random() < 0.3` in `loadRandomLocation()`
- **Scoring formula**: Modify the points calculation in `calculateResults()`
- **Regions**: Edit the regions array to focus on specific areas

## Technical Notes

- Uses Google Maps JavaScript API v3
- Haversine formula for accurate distance calculations
- No backend required - runs entirely in the browser
- Responsive design with CSS Grid and Flexbox

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This is an educational project inspired by GeoGuessr. For commercial use, please ensure you comply with Google Maps Platform Terms of Service.

---

Enjoy exploring the world from your browser! 🌎✈️