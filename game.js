// WorldGuesser Game Logic

class WorldGuesser {
    constructor() {
        this.currentRound = 1;
        this.totalRounds = 5;
        this.totalScore = 0;
        this.currentLocation = null;
        this.userGuess = null;
        this.streetView = null;
        this.map = null;
        this.guessMarker = null;
        this.resultMap = null;
        
        // Initialize DOM elements
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.resultScreen = document.getElementById('result-screen');
        this.endScreen = document.getElementById('end-screen');

        // Buttons
        this.startBtn = document.getElementById('start-btn');
        this.makeGuessBtn = document.getElementById('make-guess-btn');
        this.closeMapBtn = document.getElementById('close-map-btn');
        this.submitGuessBtn = document.getElementById('submit-guess-btn');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');

        // Containers
        this.mapContainer = document.getElementById('map-container');
        this.streetviewEl = document.getElementById('streetview');
        this.mapEl = document.getElementById('map');
        this.resultMapEl = document.getElementById('result-map');

        // Info displays
        this.currentRoundEl = document.getElementById('current-round');
        this.totalScoreEl = document.getElementById('total-score');
        this.finalScoreEl = document.getElementById('final-score');
        this.performanceMessageEl = document.getElementById('performance-message');

        // Result displays
        this.userGuessEl = document.getElementById('user-guess');
        this.actualLocationEl = document.getElementById('actual-location');
        this.distanceEl = document.getElementById('distance');
        this.roundPointsEl = document.getElementById('round-points');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.makeGuessBtn.addEventListener('click', () => this.showMap());
        this.closeMapBtn.addEventListener('click', () => this.hideMap());
        this.submitGuessBtn.addEventListener('click', () => this.submitGuess());
        this.nextRoundBtn.addEventListener('click', () => this.nextRound());
        this.playAgainBtn.addEventListener('click', () => this.restartGame());
    }

    async startGame() {
        this.currentRound = 1;
        this.totalScore = 0;
        this.updateScoreDisplay();
        
        this.startScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
        
        await this.loadRandomLocation();
    }

    async loadRandomLocation() {
        // Generate random coordinates
        const isRussia = Math.random() < 0.3; // 30% chance for Russia
        
        let lat, lng, country;
        
        if (isRussia) {
            // Russia bounding box
            lat = this.randomFloat(41.0, 82.0);
            lng = this.randomFloat(19.0, 169.0);
            country = 'Russia';
        } else {
            // Worldwide locations (weighted towards populated areas)
            const regions = [
                { latMin: 25, latMax: 50, lngMin: -10, lngMax: 40, name: 'Europe' },
                { latMin: 25, latMax: 50, lngMin: -125, lngMax: -65, name: 'North America' },
                { latMin: -35, latMax: 10, lngMin: -75, lngMax: -35, name: 'South America' },
                { latMin: -35, latMax: -10, lngMin: 115, lngMax: 155, name: 'Australia' },
                { latMin: 35, latMax: 45, lngMin: 125, lngMax: 145, name: 'East Asia' },
                { latMin: 10, latMax: 35, lngMin: 100, lngMax: 120, name: 'Southeast Asia' },
                { latMin: 5, latMax: 35, lngMin: 30, lngMax: 55, name: 'Middle East' },
                { latMin: -35, latMax: 35, lngMin: -20, lngMax: 55, name: 'Africa' }
            ];
            
            const region = regions[Math.floor(Math.random() * regions.length)];
            lat = this.randomFloat(region.latMin, region.latMax);
            lng = this.randomFloat(region.lngMin, region.lngMax);
            country = region.name;
        }

        this.currentLocation = { lat, lng, country, isRussia };
        
        this.currentRoundEl.textContent = this.currentRound;
        
        // Load Street View
        this.loadStreetView(lat, lng, isRussia);
    }

    loadStreetView(lat, lng, isRussia) {
        if (this.streetView) {
            this.streetView = null;
        }

        if (isRussia) {
            // For Russia, we'll use a placeholder message about Yandex
            // In a real implementation, you'd integrate Yandex Maps API
            this.streetviewEl.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f0f0f0;">
                    <h3 style="color: #333; margin-bottom: 1rem;">🇷🇺 Russian Location</h3>
                    <p style="color: #666; text-align: center; padding: 2rem;">
                        This location is in Russia.<br><br>
                        <strong>To use Yandex Street View:</strong><br>
                        You would need to integrate the Yandex Maps API.<br><br>
                        Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </p>
                    <a href="https://yandex.ru/maps/?ll=${lng}%2C${lat}&z=16&l=stv" 
                       target="_blank" 
                       style="margin-top: 1rem; color: #fc3f1d; text-decoration: none; font-weight: bold;">
                        Open in Yandex Maps →
                    </a>
                </div>
            `;
        } else {
            // Use Google Street View for non-Russia locations
            this.streetView = new google.maps.StreetViewPanorama(
                this.streetviewEl,
                {
                    position: { lat: lat, lng: lng },
                    pov: { heading: 0, pitch: 0 },
                    zoom: 1,
                    addressControl: false,
                    showRoadLabels: false,
                    linksControl: true,
                    panControl: true,
                    zoomControl: true
                }
            );
        }
    }

    showMap() {
        this.mapContainer.classList.remove('hidden');
        
        if (!this.map) {
            this.map = new google.maps.Map(this.mapEl, {
                center: { lat: 20, lng: 0 },
                zoom: 2,
                streetViewControl: false,
                mapTypeControl: false
            });

            // Add click listener for guessing
            this.map.addListener('click', (event) => {
                this.placeGuessMarker(event.latLng);
            });
        }
    }

    hideMap() {
        this.mapContainer.classList.add('hidden');
    }

    placeGuessMarker(latLng) {
        if (this.guessMarker) {
            this.guessMarker.setPosition(latLng);
        } else {
            this.guessMarker = new google.maps.Marker({
                position: latLng,
                map: this.map,
                title: 'Your Guess'
            });
        }
        this.userGuess = { lat: latLng.lat(), lng: latLng.lng() };
    }

    submitGuess() {
        if (!this.userGuess) {
            alert('Please click on the map to make your guess!');
            return;
        }

        this.hideMap();
        this.calculateResults();
    }

    calculateResults() {
        const actual = this.currentLocation;
        const guess = this.userGuess;

        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
            actual.lat, actual.lng,
            guess.lat, guess.lng
        );

        // Calculate points (max 5000 per round)
        const maxDistance = 20000; // km
        let points = Math.max(0, Math.round(5000 * (1 - distance / maxDistance)));
        
        if (distance < 1) {
            points = 5000; // Perfect guess!
        }

        this.totalScore += points;
        this.updateScoreDisplay();

        // Display results
        this.displayResults(distance, points, guess);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    displayResults(distance, points, guess) {
        this.userGuessEl.textContent = `${guess.lat.toFixed(4)}, ${guess.lng.toFixed(4)}`;
        this.actualLocationEl.textContent = `${this.currentLocation.lat.toFixed(4)}, ${this.currentLocation.lng.toFixed(4)} (${this.currentLocation.country})`;
        this.distanceEl.textContent = `${distance.toFixed(2)} km`;
        this.roundPointsEl.textContent = points.toLocaleString();

        // Show result map with both markers
        this.showResultMap(guess);

        // Show result screen
        this.gameScreen.classList.remove('active');
        this.resultScreen.classList.add('active');

        // Update button text for last round
        if (this.currentRound >= this.totalRounds) {
            this.nextRoundBtn.textContent = 'See Final Results';
        } else {
            this.nextRoundBtn.textContent = 'Next Round';
        }
    }

    showResultMap(guess) {
        if (this.resultMap) {
            this.resultMap = null;
        }

        this.resultMap = new google.maps.Map(this.resultMapEl, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            streetViewControl: false,
            mapTypeControl: false
        });

        // Add marker for actual location
        new google.maps.Marker({
            position: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
            map: this.resultMap,
            title: 'Actual Location',
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }
        });

        // Add marker for guess
        new google.maps.Marker({
            position: { lat: guess.lat, lng: guess.lng },
            map: this.resultMap,
            title: 'Your Guess',
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });

        // Draw line between them
        new google.maps.Polyline({
            path: [
                { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
                { lat: guess.lat, lng: guess.lng }
            ],
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: this.resultMap
        });
    }

    nextRound() {
        this.resultScreen.classList.remove('active');
        
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
        } else {
            this.currentRound++;
            this.userGuess = null;
            this.guessMarker = null;
            this.gameScreen.classList.add('active');
            this.loadRandomLocation();
        }
    }

    endGame() {
        this.gameScreen.classList.remove('active');
        this.endScreen.classList.add('active');
        
        this.finalScoreEl.textContent = this.totalScore.toLocaleString();
        
        // Performance message
        const maxScore = this.totalRounds * 5000;
        const percentage = (this.totalScore / maxScore) * 100;
        
        let message = '';
        if (percentage >= 90) {
            message = '🏆 Incredible! You\'re a geography master!';
        } else if (percentage >= 70) {
            message = '🌟 Great job! You know your world well!';
        } else if (percentage >= 50) {
            message = '👍 Good effort! Keep practicing!';
        } else if (percentage >= 30) {
            message = '📚 Not bad! There\'s room for improvement!';
        } else {
            message = '🗺️ Time to explore more of the world!';
        }
        
        this.performanceMessageEl.textContent = message;
    }

    restartGame() {
        this.endScreen.classList.remove('active');
        this.startGame();
    }

    updateScoreDisplay() {
        this.totalScoreEl.textContent = this.totalScore.toLocaleString();
    }

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
}

// Initialize game when page loads
let game;

window.addEventListener('DOMContentLoaded', () => {
    // Check if Google Maps is loaded
    if (typeof google !== 'undefined' && google.maps) {
        game = new WorldGuesser();
    } else {
        // Wait for Google Maps to load
        window.initGame = () => {
            game = new WorldGuesser();
        };
        
        // Show waiting message
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
                <div>
                    <h2>Loading WorldGuesser...</h2>
                    <p style="margin-top: 1rem;">Please make sure you have added a valid Google Maps API key in index.html</p>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.8;">Replace YOUR_GOOGLE_MAPS_API_KEY with your actual key</p>
                </div>
            </div>
        `;
    }
});
