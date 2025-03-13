// app.js - Main JavaScript for the Game Portal Frontend

// API endpoints
const API_BASE_URL = '/api';
const GAMES_ENDPOINT = `${API_BASE_URL}/games`;
const STEAM_ENDPOINT = `${API_BASE_URL}/steam`;

// Main Elements
const homePage = document.getElementById('home-page');
const gamePage = document.getElementById('game-page');
const gamesGrid = document.getElementById('games-grid');
const backButton = document.getElementById('back-button');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// Game Detail Elements
const gameHeroBg = document.getElementById('game-hero-bg');
const gameTitle = document.getElementById('game-title');
const gameBoxart = document.getElementById('game-boxart');
const gameTags = document.getElementById('game-tags');
const recommendations = document.getElementById('recommendations');
const gameMeta = document.getElementById('game-meta');
const gameDescription = document.getElementById('game-description');
const gameInstructions = document.getElementById('game-instructions');
const trailerSection = document.getElementById('trailer-section');
const screenshotsSection = document.getElementById('screenshots-section');
const filesList = document.getElementById('files-list');
const steamStoreLink = document.getElementById('steam-store-link');
const editGameButton = document.getElementById('edit-game-button');

// Requirements Details
const systemRequirementsContent = document.getElementById('system-requirements-content');
const systemRequirementsContainer = document.querySelector('.system-requirements-container');

// Instructions Toggle
const instructionsHeader = document.getElementById('instructions-header');
const instructionsContent = document.getElementById('instructions-content');

// Lightbox Elements
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const closeLightbox = document.getElementById('close-lightbox');

// Edit Game Modal Elements
const editGameModal = document.getElementById('edit-game-modal');
const editGameForm = document.getElementById('edit-game-form');
const closeEditModal = document.getElementById('close-edit-modal');
const saveGameButton = document.getElementById('save-game-button');

// Steam Modal Elements
const addGameButton = document.getElementById('add-game-button');
const steamModal = document.getElementById('steam-modal');
const closeModal = document.querySelector('.close-modal');
const fetchSteamDataBtn = document.getElementById('fetch-steam-data');
const steamAppIdInput = document.getElementById('steam-app-id');
const steamLoading = document.getElementById('steam-loading');
const jsonPreview = document.getElementById('json-preview');
const jsonPreviewContainer = document.getElementById('json-preview-container');
const copyJsonBtn = document.getElementById('copy-json');
const createGameButton = document.getElementById('create-game-button');
const downloadProgressContainer = document.getElementById('download-progress-container');
const downloadProgressItems = document.getElementById('download-progress-items');
const downloadProgressBar = document.getElementById('download-progress-bar');
const downloadStatus = document.getElementById('download-status');

// File Upload Elements
const uploadFilesButton = document.getElementById('upload-files-button');
const fileUploadModal = document.getElementById('file-upload-modal');
const closeFileUploadModal = document.getElementById('close-file-upload-modal');
const fileUploadForm = document.getElementById('file-upload-form');
const fileInput = document.getElementById('file-input');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadStatus = document.getElementById('upload-status');

// State
let games = [];
let currentGame = null;
let prefetchCache = {}; // Cache for prefetched game data
let currentHoveredGame = null; // Track which game is currently being hovered
let prefetchDelay; // Timer for delaying prefetch to avoid unnecessary requests

// Steam store URL template
const steamStoreUrl = 'https://store.steampowered.com/app/';

// Initialize the app
async function init() {
    try {
        await loadGames();
        
        // Hide loading and render games
        loading.style.display = 'none';
        renderGamesGrid();
        
        // Check URL for game parameter
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');
        if (gameId) {
            const game = games.find(g => g.id === gameId);
            if (game) {
                openGamePage(game);
            }
        }
        
        // Set up instructions toggle
        instructionsHeader.addEventListener('click', toggleInstructions);
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Failed to load games. Please try again later.';
    }
}

// Load games from the API
async function loadGames() {
    try {
        const response = await fetch(GAMES_ENDPOINT);
        if (!response.ok) {
            throw new Error(`Failed to load games: ${response.status} ${response.statusText}`);
        }
        
        games = await response.json();
        return games;
    } catch (error) {
        console.error('Error loading games:', error);
        throw error;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Back button
    backButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update URL (remove game parameter)
        const url = new URL(window.location);
        url.searchParams.delete('game');
        window.history.pushState({}, '', url);
        
        // Show home page, hide game page
        homePage.style.display = 'block';
        gamePage.style.display = 'none';
    });
    
    // Lightbox close
    closeLightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
    
    // Close lightbox when clicking anywhere
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });
    
    // Close lightbox with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');
        
        if (gameId) {
            const game = games.find(g => g.id === gameId);
            if (game) {
                openGamePage(game);
            }
        } else {
            homePage.style.display = 'block';
            gamePage.style.display = 'none';
        }
    });
    
    // Add game button (open Steam modal)
    addGameButton.addEventListener('click', () => {
        steamModal.style.display = 'block';
        // Reset the form
        steamAppIdInput.value = '';
        jsonPreviewContainer.style.display = 'none';
        downloadProgressContainer.style.display = 'none';
        jsonPreview.innerHTML = '';
        downloadProgressItems.innerHTML = '';
        downloadProgressBar.style.width = '0%';
        downloadStatus.textContent = 'Preparing download...';
    });
    
    // Close Steam modal
    closeModal.addEventListener('click', () => {
        steamModal.style.display = 'none';
    });
    
    // Close Steam modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === steamModal) {
            steamModal.style.display = 'none';
        }
        if (e.target === editGameModal) {
            editGameModal.style.display = 'none';
        }
        if (e.target === fileUploadModal) {
            fileUploadModal.style.display = 'none';
        }
    });
    
    // Fetch Steam data button
    fetchSteamDataBtn.addEventListener('click', async () => {
        const appId = steamAppIdInput.value.trim();
        
        if (!appId) {
            alert('Please enter a valid Steam App ID');
            return;
        }
        
        // Show loading
        steamLoading.style.display = 'block';
        jsonPreviewContainer.style.display = 'none';
        downloadProgressContainer.style.display = 'none';
        
        try {
            const response = await fetch(`${STEAM_ENDPOINT}/${appId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch Steam data: ${response.status} ${response.statusText}`);
            }
            
            const steamData = await response.json();
            
            // Create comprehensive JSON
            const templateJson = createComprehensiveJson(steamData, appId);
            
            // Display JSON
            const formattedJson = JSON.stringify(templateJson, null, 2);
            jsonPreview.textContent = formattedJson;
            jsonPreviewContainer.style.display = 'block';
            
        } catch (error) {
            console.error('Error fetching Steam data:', error);
            alert(`Error: ${error.message}. Please try again or check the App ID.`);
        } finally {
            // Hide loading
            steamLoading.style.display = 'none';
        }
    });
    
    // Copy JSON button
    copyJsonBtn.addEventListener('click', () => {
        try {
            navigator.clipboard.writeText(jsonPreview.textContent);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Copied to clipboard!';
            
            // Add success message after the copy button
            copyJsonBtn.parentNode.appendChild(successMessage);
            
            // Remove success message after animation completes
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
            
        } catch (error) {
            console.error('Failed to copy JSON:', error);
            alert('Failed to copy to clipboard. Please try again.');
        }
    });

    // Create game button
    createGameButton.addEventListener('click', async () => {
        try {
            // Parse JSON data
            const gameData = JSON.parse(jsonPreview.textContent);
            
            // Show download progress container
            downloadProgressContainer.style.display = 'block';
            downloadStatus.textContent = 'Creating game and downloading assets...';
            downloadProgressBar.style.width = '10%';
            
            // Call API to create game
            const response = await fetch(`${GAMES_ENDPOINT}/steam`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameData })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create game');
            }
            
            const result = await response.json();
            
            // Update UI
            downloadStatus.textContent = 'Game created successfully!';
            downloadProgressBar.style.width = '100%';
            
            // Reload games
            await loadGames();
            renderGamesGrid();
            
            // Close modal after a delay
            setTimeout(() => {
                steamModal.style.display = 'none';
                
                // Open the new game page
                if (result.game) {
                    openGamePage(result.game);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error creating game:', error);
            downloadStatus.textContent = `Error: ${error.message}`;
            downloadStatus.style.color = '#c15d3e';
        }
    });
    
    // Edit game button
    if (editGameButton) {
        editGameButton.addEventListener('click', () => {
            if (!currentGame) return;
            
            // Populate form with current game data
            populateEditForm(currentGame);
            
            // Show modal
            editGameModal.style.display = 'block';
        });
    }
    
    // Close edit modal
    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            editGameModal.style.display = 'none';
        });
    }
    
    // Save game changes
    if (saveGameButton && editGameForm) {
        editGameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentGame) return;
            
            try {
                // Get form data
                const formData = new FormData(editGameForm);
                const updatedGame = { ...currentGame };
                
                // Update basic fields
                updatedGame.name = formData.get('name') || updatedGame.name;
                updatedGame.short_description = formData.get('short_description') || updatedGame.short_description;
                updatedGame.description = formData.get('description') || updatedGame.description;
                updatedGame.genre = formData.get('genre') || updatedGame.genre;
                updatedGame.players = formData.get('players') || updatedGame.players;
                updatedGame.releaseDate = formData.get('releaseDate') || updatedGame.releaseDate;
                updatedGame.studio = formData.get('studio') || updatedGame.studio;
                updatedGame.publisher = formData.get('publisher') || updatedGame.publisher;
                updatedGame.instructions = formData.get('instructions') || updatedGame.instructions;
                
                // Save changes
                const response = await fetch(`${GAMES_ENDPOINT}/${currentGame.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedGame)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update game');
                }
                
                const result = await response.json();
                
                // Close modal
                editGameModal.style.display = 'none';
                
                // Reload game data
                currentGame = result.game;
                
                // Update displayed game
                updateGameDisplay(currentGame);
                
                // Show success message
                showNotification('Game updated successfully!', 'success');
                
                // Reload games list
                await loadGames();
                
            } catch (error) {
                console.error('Error updating game:', error);
                showNotification(`Error: ${error.message}`, 'error');
            }
        });
    }
    
    // Upload files button
    if (uploadFilesButton) {
        uploadFilesButton.addEventListener('click', () => {
            if (!currentGame) return;
            
            // Reset form
            fileUploadForm.reset();
            uploadProgressContainer.style.display = 'none';
            
            // Show modal
            fileUploadModal.style.display = 'block';
        });
    }
    
    // Close file upload modal
    if (closeFileUploadModal) {
        closeFileUploadModal.addEventListener('click', () => {
            fileUploadModal.style.display = 'none';
        });
    }
    
    // File upload form submission
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentGame) return;
            
            const files = fileInput.files;
            
            if (!files || files.length === 0) {
                showNotification('Please select at least one file to upload', 'error');
                return;
            }
            
            try {
                // Show progress container
                uploadProgressContainer.style.display = 'block';
                uploadStatus.textContent = 'Uploading files...';
                uploadProgressBar.style.width = '10%';
                
                // Create form data
                const formData = new FormData();
                
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }
                
                // Upload files
                const response = await fetch(`${GAMES_ENDPOINT}/${currentGame.id}/files`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to upload files');
                }
                
                const result = await response.json();
                
                // Update progress
                uploadStatus.textContent = 'Files uploaded successfully!';
                uploadProgressBar.style.width = '100%';
                
                // Close modal after a delay
                setTimeout(() => {
                    fileUploadModal.style.display = 'none';
                    
                    // Reload game data and update UI
                    loadGameDetails(currentGame.id).then(game => {
                        currentGame = game;
                        updateGameDisplay(game);
                    });
                    
                }, 2000);
                
            } catch (error) {
                console.error('Error uploading files:', error);
                uploadStatus.textContent = `Error: ${error.message}`;
                uploadStatus.style.color = '#c15d3e';
            }
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

// Populate edit form with game data
function populateEditForm(game) {
    if (!editGameForm) return;
    
    // Set basic fields
    editGameForm.elements['name'].value = game.name || '';
    editGameForm.elements['short_description'].value = game.short_description || '';
    editGameForm.elements['description'].value = game.description || '';
    editGameForm.elements['genre'].value = game.genre || '';
    editGameForm.elements['players'].value = game.players || '';
    editGameForm.elements['releaseDate'].value = game.releaseDate || '';
    editGameForm.elements['studio'].value = game.studio || '';
    editGameForm.elements['publisher'].value = game.publisher || '';
    editGameForm.elements['instructions'].value = game.instructions || '';
}

// Toggle instructions section
function toggleInstructions() {
    instructionsHeader.classList.toggle('active');
    instructionsContent.classList.toggle('active');
}

// Prefetch game data on hover
async function prefetchGameData(game) {
    // Don't prefetch if it's already in the cache
    if (prefetchCache[game.id]) {
        return;
    }
    
    console.log(`Prefetching data for ${game.name}...`);
    
    // Create a cache entry for this game
    prefetchCache[game.id] = {
        basic: true, // We already have basic game info
        screenshots: false
    };
    
    // Prefetch screenshots by creating Image objects to load them into browser cache
    if (game.screenshots && Array.isArray(game.screenshots) && game.screenshots.length > 0) {
        const preloadedScreenshots = [];
        
        const preloadPromises = game.screenshots.map(screenshot => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    preloadedScreenshots.push(screenshot);
                    resolve();
                };
                img.onerror = () => resolve(); // Resolve even on error to continue
                img.src = `games/${game.folder}/screenshots/${screenshot}`;
            });
        });
        
        // Wait for all screenshots to load (or fail)
        await Promise.all(preloadPromises);
        
        prefetchCache[game.id].screenshots = true;
        console.log(`${preloadedScreenshots.length} screenshots for ${game.name} prefetched`);
    }
    
    // Preload banner image
    const bannerPromise = new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            prefetchCache[game.id].banner = true;
            resolve();
        };
        img.onerror = () => resolve(); // Resolve even on error
        img.src = `games/${game.folder}/banner.jpg`;
    });
    
    await bannerPromise;
    
    console.log(`Prefetching for ${game.name} complete`);
}

// Render games grid with short descriptions
function renderGamesGrid() {
    gamesGrid.innerHTML = '';
    
    games.forEach((game, index) => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.setAttribute('data-id', game.id);
        
        // Add a unique timestamp to prevent proxy caching issues
        const cacheBuster = `?t=${Date.now()}-${index}`;
        
        // Box art image path with cache buster
        const boxArtPath = (game.boxArtPath || `games/${game.folder}/boxart.jpg`) + cacheBuster;
        
        // Use short_description on homepage if available, otherwise truncate the full description
        let cardDescription = '';
        if (game.short_description) {
            cardDescription = game.short_description;
        } else {
            // Create a temporary div to strip HTML tags from the description
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = game.description;
            const textOnly = tempDiv.textContent || tempDiv.innerText || '';
            
            // Truncate to max 120 characters
            cardDescription = textOnly.length > 120 ? 
                textOnly.substring(0, 120) + '...' : 
                textOnly;
        }
        
        // Create the card content - use a default color background instead of SVG
        gameCard.innerHTML = `
            <img src="${boxArtPath}" alt="${game.name}" 
                 style="background-color: #2a475e; min-height: 140px;"
                 onerror="this.onerror=null; this.src=''; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.style.color='#66c0f4'; this.style.fontSize='14px'; this.innerText='${game.name}';">
            ${game.hasSteamData || game.steamAppId ? '<div class="steam-icon"><i class="fab fa-steam"></i></div>' : ''}
            <div class="game-info">
                <h3 class="game-title">${game.name}</h3>
                <p class="game-description">${cardDescription}</p>
                <div class="game-meta">
                    ${game.genre ? `<span class="game-tag">${game.genre}</span>` : ''}
                    ${game.players ? `<span class="game-tag">${game.players} Players</span>` : ''}
                    ${game.releaseDate ? `<span>Released: ${formatDate(game.releaseDate)}</span>` : ''}
                </div>
            </div>
        `;
        
        // Add hover event listeners for prefetching
        gameCard.addEventListener('mouseenter', () => {
            // Clear any previous prefetch delay
            clearTimeout(prefetchDelay);
            
            // Set current hovered game
            currentHoveredGame = game;
            
            // Add a small delay before starting prefetch to avoid unnecessary requests for quick hover movements
            prefetchDelay = setTimeout(() => {
                // Only prefetch if still hovering after the delay
                if (currentHoveredGame === game) {
                    prefetchGameData(game);
                }
            }, 100); // 100ms delay
        });
        
        gameCard.addEventListener('mouseleave', () => {
            // Clear the prefetch delay when mouse leaves
            clearTimeout(prefetchDelay);
            if (currentHoveredGame === game) {
                currentHoveredGame = null;
            }
        });
        
        gameCard.addEventListener('click', () => {
            openGamePage(game);
        });
        
        gamesGrid.appendChild(gameCard);
    });
}

// Load detailed game information from API
async function loadGameDetails(id) {
    try {
        const response = await fetch(`${GAMES_ENDPOINT}/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to load game: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error loading game ${id}:`, error);
        throw error;
    }
}

// Open the game detail page
async function openGamePage(game) {
    try {
        // Try to get the most up-to-date game data
        const updatedGame = await loadGameDetails(game.id);
        currentGame = updatedGame;
        
        // Update UI with game data
        updateGameDisplay(currentGame);
        
        // Show game page, hide home page
        gamePage.style.display = 'block';
        homePage.style.display = 'none';
        
        // Update URL with game ID
        const url = new URL(window.location);
        url.searchParams.set('game', game.id);
        window.history.pushState({}, '', url);
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        console.error(`Error opening game ${game.id}:`, error);
        showNotification(`Error loading game: ${error.message}`, 'error');
    }
}

function updateSystemRequirements(game) {
    if (game.systemRequirements && systemRequirementsContainer && systemRequirementsContent) {
        systemRequirementsContainer.style.display = 'block';
        
        // Create compact system requirements HTML
        const systemReqHTML = `
            <table class="req-table">
                ${game.systemRequirements.os ? `
                <tr>
                    <td><i class="fas fa-desktop"></i> OS:</td>
                    <td>${game.systemRequirements.os}</td>
                </tr>` : ''}
                
                ${game.systemRequirements.processor ? `
                <tr>
                    <td><i class="fas fa-microchip"></i> CPU:</td>
                    <td>${game.systemRequirements.processor}</td>
                </tr>` : ''}
                
                ${game.systemRequirements.memory ? `
                <tr>
                    <td><i class="fas fa-memory"></i> RAM:</td>
                    <td>${game.systemRequirements.memory}</td>
                </tr>` : ''}
                
                ${game.systemRequirements.graphics ? `
                <tr>
                    <td><i class="fas fa-tv"></i> GPU:</td>
                    <td>${game.systemRequirements.graphics}</td>
                </tr>` : ''}
                
                ${game.systemRequirements.storage ? `
                <tr>
                    <td><i class="fas fa-hdd"></i> Storage:</td>
                    <td>${game.systemRequirements.storage}</td>
                </tr>` : ''}
            </table>
        `;
        
        // Update content
        systemRequirementsContent.innerHTML = systemReqHTML;
    } else if (systemRequirementsContainer) {
        // Hide if no data
        systemRequirementsContainer.style.display = 'none';
    }
}


// Update the game display with current game data
function updateGameDisplay(game) {
    // Reset sections that might not be populated
    trailerSection.innerHTML = '';
    screenshotsSection.innerHTML = '';
    recommendations.style.display = 'none';
    steamStoreLink.style.display = 'none';
    
    // Reset instructions to collapsed state
    instructionsHeader.classList.remove('active');
    instructionsContent.classList.remove('active');
    
    // Set basic game details from local data
    gameTitle.textContent = game.name;
    
    // Adjust game title font size based on length
    if (game.name.length > 30) {
        gameTitle.style.fontSize = "1.8rem";
    } else if (game.name.length > 20) {
        gameTitle.style.fontSize = "2.2rem";
    } else {
        gameTitle.style.fontSize = "2.5rem";
    }

    
    
    // Use full description for the detail page
    gameDescription.innerHTML = game.description;
    gameInstructions.innerHTML = game.instructions || 'No instructions available.';

     // Handle system requirements section
     if (game.systemRequirements && systemRequirementsContainer && systemRequirementsContent) {
        systemRequirementsContainer.style.display = 'block';
        
        // Create system requirements HTML
        const systemReqHTML = `
            <div class="req-grid">
                ${game.systemRequirements.os ? `
                <div class="req-item">
                    <div class="req-icon"><i class="fas fa-desktop"></i></div>
                    <div class="req-details">
                        <div class="req-label">OS</div>
                        <div class="req-value">${game.systemRequirements.os}</div>
                    </div>
                </div>` : ''}
                
                ${game.systemRequirements.processor ? `
                <div class="req-item">
                    <div class="req-icon"><i class="fas fa-microchip"></i></div>
                    <div class="req-details">
                        <div class="req-label">Processor</div>
                        <div class="req-value">${game.systemRequirements.processor}</div>
                    </div>
                </div>` : ''}
                
                ${game.systemRequirements.memory ? `
                <div class="req-item">
                    <div class="req-icon"><i class="fas fa-memory"></i></div>
                    <div class="req-details">
                        <div class="req-label">Memory</div>
                        <div class="req-value">${game.systemRequirements.memory}</div>
                    </div>
                </div>` : ''}
                
                ${game.systemRequirements.graphics ? `
                <div class="req-item">
                    <div class="req-icon"><i class="fas fa-tv"></i></div>
                    <div class="req-details">
                        <div class="req-label">Graphics</div>
                        <div class="req-value">${game.systemRequirements.graphics}</div>
                    </div>
                </div>` : ''}
                
                ${game.systemRequirements.storage ? `
                <div class="req-item">
                    <div class="req-icon"><i class="fas fa-hdd"></i></div>
                    <div class="req-details">
                        <div class="req-label">Storage</div>
                        <div class="req-value">${game.systemRequirements.storage}</div>
                    </div>
                </div>` : ''}
            </div>
        `;
        
        // Update the content
        systemRequirementsContent.innerHTML = systemReqHTML;
    } else if (systemRequirementsContainer) {
        // Hide the system requirements section if no data
        systemRequirementsContainer.style.display = 'none';
    }
    updateSystemRequirements(game);
    // Set background with proper fallback
    gameHeroBg.style.backgroundImage = 'linear-gradient(135deg, #171a21, #2a475e)';
    
    // Try to load banner image
    const bannerUrl = `games/${game.folder}/banner.jpg`;
    const testBanner = new Image();
    testBanner.onload = function() {
        gameHeroBg.style.backgroundImage = `url('${bannerUrl}?t=${Date.now()}')`;
        gameHeroBg.style.backgroundSize = 'cover';
        document.body.classList.add('has-game-banner');
    };
    testBanner.src = `${bannerUrl}?t=${Date.now()}`;
    
    // Set boxart image
    gameBoxart.src = '';
    const boxartUrl = `games/${game.folder}/boxart.jpg?t=${Date.now()}`;
    
    const tempImage = new Image();
    tempImage.onload = function() {
        gameBoxart.src = boxartUrl;
    };
    tempImage.onerror = function() {
        // Try banner as fallback, then use SVG placeholder
        const tempBanner = new Image();
        tempBanner.onload = function() {
            gameBoxart.src = `${bannerUrl}?t=${Date.now()}`;
        };
        tempBanner.onerror = function() {
            gameBoxart.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="250" height="350" viewBox="0 0 250 350"><rect width="250" height="350" fill="%232a475e"/><text x="125" y="175" fill="%2366c0f4" font-family="Arial" font-size="18" text-anchor="middle">${game.name}</text></svg>`;
        };
        tempBanner.src = `${bannerUrl}?t=${Date.now()}`;
    };
    tempImage.src = boxartUrl;
    
    // Render game metadata
    renderGameMetadata(game);
    
    // Load and render screenshots
    loadScreenshots(game);
    
    // Render download files
    renderDownloadFiles(game);
    
    // If game has Steam App ID, update the store link
    if (game.steamAppId) {
        steamStoreLink.href = `${steamStoreUrl}${game.steamAppId}`;
        steamStoreLink.style.display = 'flex';
        
        // Add trailer if available
        if (game.trailerUrl) {
            // Check if it's a local or remote URL
            const trailerUrl = game.trailerUrl;
            
            trailerSection.innerHTML = `
                <div class="trailer-video-container">
                    <video 
                        id="game-trailer"
                        class="trailer-video"
                        src="${trailerUrl}"
                        muted
                        autoplay
                        playsinline
                        controls
                        style="width: 100%; display: block; margin: 0; padding: 0;"
                    ></video>
                </div>
            `;
        }
        
        // Show recommendations if available
        if (game.recommendations) {
            recommendations.style.display = 'flex';
            
            const percent = game.recommendationPercent || 0;
            let ratingClass = 'mixed';
            let ratingText = 'Mixed';
            
            if (percent >= 80) {
                ratingClass = 'positive';
                ratingText = 'Very Positive';
            } else if (percent >= 70) {
                ratingClass = 'positive';
                ratingText = 'Positive';
            } else if (percent <= 40) {
                ratingClass = 'negative';
                ratingText = 'Negative';
            } else if (percent <= 20) {
                ratingClass = 'negative';
                ratingText = 'Very Negative';
            }
            
            recommendations.className = `recommendations ${ratingClass}`;
            recommendations.innerHTML = `
                <i class="fas fa-thumbs-up"></i>
                <span>${ratingText} (${game.recommendations.toLocaleString()} reviews)</span>
            `;
        }
    }
}

// Render game metadata
function renderGameMetadata(game) {
    gameMeta.innerHTML = `
        <div class="meta-item">
            <i class="fas fa-gamepad"></i>
            <span>${game.genre || 'Unknown'}</span>
        </div>
        ${game.players ? `
        <div class="meta-item">
            <i class="fas fa-users"></i>
            <span>${game.players} Players</span>
        </div>` : ''}
        ${game.releaseDate ? `
        <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>${formatDate(game.releaseDate)}</span>
        </div>` : ''}
        ${game.studio || game.developer ? `
        <div class="meta-item">
            <i class="fas fa-building"></i>
            <span>${game.studio || game.developer}</span>
        </div>` : ''}
        ${game.publisher ? `
        <div class="meta-item">
            <i class="fas fa-briefcase"></i>
            <span>${game.publisher}</span>
        </div>` : ''}
    `;
    
    // Render tags if available
    gameTags.innerHTML = '';
    if (game.categories && Array.isArray(game.categories)) {
        game.categories.forEach(category => {
            const tag = document.createElement('span');
            tag.className = 'game-tag';
            tag.textContent = category;
            gameTags.appendChild(tag);
        });
    }
}

// Load screenshots for a game
function loadScreenshots(game) {
    // Get the screenshots section element
    const screenshotsSection = document.getElementById('screenshots-section');
    
    // Clear existing content
    screenshotsSection.innerHTML = '';
    
    // If game has screenshots array, use those
    if (game.screenshots && Array.isArray(game.screenshots) && game.screenshots.length > 0) {
        console.log(`Loading ${game.screenshots.length} screenshots for ${game.name}`);
        
        // Create screenshots gallery
        const screenshotsGallery = document.createElement('div');
        screenshotsGallery.className = 'screenshots-gallery';
        
        // Track how many images were successfully loaded
        let loadedImages = 0;
        
        // Create a container for screenshots with black background
        const screenshotsContainer = document.createElement('div');
        screenshotsContainer.className = 'screenshots-container';
        
        // Add container to screenshots section
        screenshotsSection.appendChild(screenshotsContainer);
        
        // Add screenshots gallery to container
        screenshotsContainer.appendChild(screenshotsGallery);
        
        // Add navigation buttons
        const leftNavButton = document.createElement('div');
        leftNavButton.className = 'screenshots-nav-button left';
        leftNavButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        
        const rightNavButton = document.createElement('div');
        rightNavButton.className = 'screenshots-nav-button right';
        rightNavButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        
        // Add event listeners for scrolling
        leftNavButton.addEventListener('click', () => {
            screenshotsGallery.scrollBy({ left: -300, behavior: 'smooth' });
        });
        
        rightNavButton.addEventListener('click', () => {
            screenshotsGallery.scrollBy({ left: 300, behavior: 'smooth' });
        });
        
        // Add nav buttons to container
        screenshotsContainer.appendChild(leftNavButton);
        screenshotsContainer.appendChild(rightNavButton);
        
        // Loading indicator for screenshots
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.innerHTML = `
            <div class="spinner"></div>
            <p>Loading screenshots...</p>
        `;
        screenshotsContainer.appendChild(loadingIndicator);
        
        // Process each screenshot
        game.screenshots.forEach((screenshot, index) => {
            const img = document.createElement('img');
            img.className = 'screenshot-thumb';
            const screenshotUrl = `games/${game.folder}/screenshots/${screenshot}?t=${Date.now()}`;
            
            // Load indicator to track image loading
            img.onload = function() {
                loadedImages++;
                this.style.display = 'block';
                
                // If all images are loaded, remove loading indicator
                if (loadedImages === game.screenshots.length) {
                    loadingIndicator.remove();
                }
            };
            
            // Handle image loading errors silently
            img.onerror = function() {
                console.warn(`Failed to load screenshot: ${screenshotUrl}`);
                this.remove(); // Remove image if it fails to load
                
                // If all attempts have completed, remove loading indicator
                loadedImages++;
                if (loadedImages === game.screenshots.length) {
                    loadingIndicator.remove();
                    
                    // If no images loaded successfully, show error message
                    if (screenshotsGallery.children.length === 0) {
                        screenshotsContainer.innerHTML = `
                            <div class="error" style="background: rgba(0,0,0,0.5);">
                                No screenshots could be loaded for this game.
                            </div>
                        `;
                    }
                }
            };
            
            // Set image properties
            img.src = screenshotUrl;
            img.alt = `Game Screenshot ${index + 1}`;
            img.style.display = 'none'; // Hide until loaded
            
            // Open lightbox when clicked
            img.addEventListener('click', () => {
                lightboxImage.src = screenshotUrl;
                lightbox.classList.add('active');
            });
            
            screenshotsGallery.appendChild(img);
        });
    } else {
        console.log(`No screenshots available for ${game.name}`);
        // Optionally, show a message when no screenshots are available
        screenshotsSection.innerHTML = `
            <div class="screenshots-container" style="min-height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
                <p style="color: #8f98a0;">No screenshots available for this game.</p>
            </div>
        `;
    }
}

// Render download files
function renderDownloadFiles(game) {
    filesList.innerHTML = '';
    
    if (game.downloadFiles && Array.isArray(game.downloadFiles) && game.downloadFiles.length > 0) {
        // Use download files defined in the game object
        game.downloadFiles.forEach(file => {
            addFileToList(file, game.folder);
        });
    } else {
        // Add a message if no files are defined
        filesList.innerHTML = `
            <p>No download files available.</p>
            <button id="upload-files-btn" class="download-link" style="margin-top: 10px; display: inline-flex;">
                <i class="fas fa-upload"></i> Upload Files
            </button>
        `;
        
        // Add event listener to the upload button
        const uploadFilesBtn = document.getElementById('upload-files-btn');
        if (uploadFilesBtn) {
            uploadFilesBtn.addEventListener('click', () => {
                if (uploadFilesButton) {
                    uploadFilesButton.click();
                }
            });
        }
    }
}

function addFileToList(file, gameFolder) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    // Determine icon based on file type or extension
    let icon = 'fa-file';
    const fileType = file.type || '';
    const extension = file.filename.split('.').pop().toLowerCase();
    
    if (fileType === 'application' || ['exe', 'msi', 'dmg', 'app'].includes(extension)) {
        icon = 'fa-file-code';
    } else if (fileType === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        icon = 'fa-file-archive';
    } else if (fileType === 'document' || ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
        icon = 'fa-file-pdf';
    }
    
    // Add timestamp for cache-busting
    const cacheBuster = `?t=${Date.now()}`;
    
    // Create the file item HTML
    fileItem.innerHTML = `
        <div class="file-info">
            <div class="file-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="file-details">
                <div class="file-name">${file.name || file.filename}</div>
                <div class="file-size">${formatFileSize(file.size) || 'Unknown size'}</div>
            </div>
        </div>
        <a href="games/${gameFolder}/${file.filename}${cacheBuster}" class="download-link" download="${file.filename}">
            <i class="fas fa-download"></i> Download
        </a>
    `;
    
    filesList.appendChild(fileItem);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null) return null;
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Extract short description from HTML content
function extractShortDescription(htmlDescription, maxLength = 150) {
    if (!htmlDescription) return '';
    
    // Create a temporary div to strip HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlDescription;
    const textOnly = tempDiv.textContent || tempDiv.innerText || '';
    
    // Truncate to specified length
    return textOnly.length > maxLength ? 
        textOnly.substring(0, maxLength) + '...' : 
        textOnly;
}

// Create comprehensive JSON from Steam data
function createComprehensiveJson(steamData, appId) {
    // Extract relevant data
    const name = steamData.name || 'Unknown Game';
    
    // Sanitize name for folder
    const folderName = sanitizeForFolderName(name);
    
    // Get detailed description from Steam data
    const description = steamData.detailed_description || 
                      steamData.about_the_game ||
                      steamData.short_description || 
                      'No description available.';
    
    // Get short description for homepage
    const shortDescription = steamData.short_description || 
                           extractShortDescription(description, 150) || 
                           'No description available.';
    
    // Get genres as an array and as a string
    let genreArray = [];
    let genreString = 'Unknown';
    if (steamData.genres && steamData.genres.length > 0) {
        genreArray = steamData.genres.map(g => g.description);
        genreString = genreArray[0]; // Primary genre
    }
    
    // Get developers/studio
    let developers = ['Unknown Developer'];
    if (steamData.developers && steamData.developers.length > 0) {
        developers = steamData.developers;
    }
    
    // Get publishers
    let publishers = [];
    if (steamData.publishers && steamData.publishers.length > 0) {
        publishers = steamData.publishers;
    }
    
    // Get release date
    let releaseDate = '';
    if (steamData.release_date && steamData.release_date.date) {
        releaseDate = steamData.release_date.date;
    }
    
    // Determine player count from categories
    let players = '1';
    let isMultiplayer = false;
    if (steamData.categories) {
        const multiplayerCategories = steamData.categories.filter(cat => 
            cat.description.includes('Multi-player') || 
            cat.description.includes('Co-op') ||
            cat.description.includes('Online')
        );
        
        if (multiplayerCategories.length > 0) {
            players = '2+';
            isMultiplayer = true;
        }
    }
    
    // Get all categories
    let categories = [];
    if (steamData.categories) {
        categories = steamData.categories.map(cat => cat.description);
    }
    
    // Get system requirements
    let systemRequirements = {
        os: "Windows 10 64-bit",
        processor: "Intel Core i3-7100 or AMD Ryzen 3 1200",
        memory: "8 GB RAM",
        graphics: "NVIDIA GeForce GTX 960 or AMD Radeon RX 5500 XT",
        storage: "75 GB available space"
    };
    
    if (steamData.pc_requirements) {
        let reqHtml = '';
        
        // Check if we have recommended requirements
        if (steamData.pc_requirements.recommended) {
            reqHtml = steamData.pc_requirements.recommended;
        } 
        // Otherwise try minimum requirements
        else if (steamData.pc_requirements.minimum) {
            reqHtml = steamData.pc_requirements.minimum;
        }
        
        if (reqHtml) {
            // OS
            const osMatch = reqHtml.match(/<strong>OS:<\/strong>(.*?)<br>/i);
            if (osMatch && osMatch[1]) systemRequirements.os = osMatch[1].trim();
            
            // Processor
            const cpuMatch = reqHtml.match(/<strong>Processor:<\/strong>(.*?)<br>/i);
            if (cpuMatch && cpuMatch[1]) systemRequirements.processor = cpuMatch[1].trim();
            
            // Memory
            const ramMatch = reqHtml.match(/<strong>Memory:<\/strong>(.*?)<br>/i);
            if (ramMatch && ramMatch[1]) systemRequirements.memory = ramMatch[1].trim();
            
            // Graphics
            const gpuMatch = reqHtml.match(/<strong>Graphics:<\/strong>(.*?)<br>/i);
            if (gpuMatch && gpuMatch[1]) systemRequirements.graphics = gpuMatch[1].trim();
            
            // Storage
            const storageMatch = reqHtml.match(/<strong>Storage:<\/strong>(.*?)<br>/i);
            if (storageMatch && storageMatch[1]) systemRequirements.storage = storageMatch[1].trim();
        }
    }
    
    // Get price information
    let price = "Unknown";
    let discountPercent = 0;
    if (steamData.price_overview) {
        price = steamData.price_overview.final_formatted || "Unknown";
        discountPercent = steamData.price_overview.discount_percent || 0;
    }
    
    // Get ratings/recommendations
    let recommendations = 0;
    let recommendationPercent = 0;
    if (steamData.recommendations && steamData.recommendations.total) {
        recommendations = steamData.recommendations.total;
    }
    
    // Generate file size estimation (based on storage requirement)
    let fileSize = "Unknown";
    if (systemRequirements.storage) {
        const sizeMatch = systemRequirements.storage.match(/(\d+)\s*GB/i);
        if (sizeMatch && sizeMatch[1]) {
            const gbSize = parseInt(sizeMatch[1]);
            fileSize = gbSize * 1024 * 1024 * 1024; // Convert GB to bytes
        }
    }
    
    // Screenshot filenames (these will be downloaded separately)
    const screenshotFilenames = [];
    if (steamData.screenshots && steamData.screenshots.length > 0) {
        for (let i = 0; i < Math.min(steamData.screenshots.length, 10); i++) {
            screenshotFilenames.push(`screenshot${i+1}.jpg`);
        }
    }
    
    // Trailer URL (if available)
    let trailerUrl = "";
    if (steamData.movies && steamData.movies.length > 0) {
        // Force HTTPS by replacing http:// with https:// 
        trailerUrl = (steamData.movies[0].webm.max || steamData.movies[0].webm[480] || "")
            .replace(/^http:/, 'https:');
    }
    
    // Legal notice
    let legalNotice = "";
    if (steamData.legal_notice) {
        legalNotice = steamData.legal_notice;
    }
    
    // Supported languages
    let supportedLanguages = "";
    if (steamData.supported_languages) {
        supportedLanguages = steamData.supported_languages;
    }
    
    // Create a unique ID for the game
    const gameId = `game-${appId}`;
    
    // Build the comprehensive JSON template
    return {
        "name": name,
        "id": gameId,
        "folder": folderName,
        "steamAppId": appId,
        "description": description,
        "short_description": shortDescription,
        "instructions": "<p><strong>Installation:</strong></p><ol><li>Download the game archive.</li><li>Extract the game</li><li>Run the executable to start the game.</li></ol>",
        "genre": genreString,
        "genres": genreArray,
        "categories": categories,
        "players": players,
        "isMultiplayer": isMultiplayer,
        "releaseDate": releaseDate,
        "developers": developers,
        "studio": developers[0],
        "publishers": publishers,
        "publisher": publishers.length > 0 ? publishers[0] : "",
        "version": "1.0.0",
        "fileSize": fileSize,
        "price": price,
        "discountPercent": discountPercent,
        "recommendations": recommendations,
        "recommendationPercent": recommendationPercent,
        "systemRequirements": systemRequirements,
        "legalNotice": legalNotice,
        "supportedLanguages": supportedLanguages,
        "downloadFiles": [],
        "screenshots": screenshotFilenames,
        "headerImageUrl": steamData.header_image || "",
        "capsuleImageUrl": steamData.capsule_image || "",
        "trailerUrl": trailerUrl
    };
}

// Sanitize a string to be used as a folder name
function sanitizeForFolderName(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50); // Limit length
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);