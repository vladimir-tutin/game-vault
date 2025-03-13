// server.js - Main entry point for the Node.js Game Portal Server
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const { spawn } = require('child_process');
const StreamZip = require('node-stream-zip');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '50mb' })); // Parse JSON with larger size limit for screenshots
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB limit for uploading game files
}));

// Serve static files from the public directory
app.use(express.static('public'));

// Define constants
const GAMES_DIR = path.join(__dirname, 'public', 'games');
const GAMES_JSON_PATH = path.join(__dirname, 'public', 'games.json');

// Create necessary directories if they don't exist
fs.ensureDirSync(GAMES_DIR);

// Initialize games.json if it doesn't exist
if (!fs.existsSync(GAMES_JSON_PATH)) {
  fs.writeJsonSync(GAMES_JSON_PATH, [], { spaces: 2 });
}

// Helper function to load games data
function loadGamesData() {
  try {
    return fs.readJsonSync(GAMES_JSON_PATH);
  } catch (error) {
    console.error('Error loading games data:', error);
    return [];
  }
}

// Helper function to save games data
function saveGamesData(games) {
  try {
    fs.writeJsonSync(GAMES_JSON_PATH, games, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving games data:', error);
    return false;
  }
}

// Helper function to sanitize folder names
function sanitizeFolderName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// Helper function to get file size in bytes
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error(`Error getting file size for ${filePath}:`, error);
    return 0;
  }
}

// API to get all games
app.get('/api/games', (req, res) => {
  const games = loadGamesData();
  res.json(games);
});

// API to get a single game by ID
app.get('/api/games/:id', (req, res) => {
  const games = loadGamesData();
  const game = games.find(g => g.id === req.params.id);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json(game);
});

// API to lookup Steam game
app.get('/api/steam/:appId', async (req, res) => {
  const appId = req.params.appId;
  
  try {
    // Proxy request to the Steam API
    const response = await axios.get(`https://n8n.irawrz.tv/webhook/steam-api?appids=${appId}`);
    
    if (response.data && response.data[appId] && response.data[appId].success) {
      res.json(response.data[appId].data);
    } else {
      res.status(404).json({ error: 'Steam game not found' });
    }
  } catch (error) {
    console.error('Error fetching Steam data:', error);
    res.status(500).json({ error: 'Error fetching Steam data' });
  }
});

// API to download Steam assets and create game
app.post('/api/games/steam', async (req, res) => {
  const { gameData } = req.body;
  
  if (!gameData || !gameData.steamAppId) {
    return res.status(400).json({ error: 'Invalid game data' });
  }
  
  try {
    // Sanitize folder name
    const folderName = gameData.folder || sanitizeFolderName(gameData.name);
    gameData.folder = folderName;
    
    // Create game directory
    const gameDir = path.join(GAMES_DIR, folderName);
    await fs.ensureDir(gameDir);
    
    // Create screenshots directory
    const screenshotsDir = path.join(gameDir, 'screenshots');
    await fs.ensureDir(screenshotsDir);
    
    // Create description-images directory
    const descImagesDir = path.join(gameDir, 'description-images');
    await fs.ensureDir(descImagesDir);
    
    // Function to download a file
    async function downloadFile(url, filePath) {
      if (!url) return null;
      
      try {
        const fileResponse = await axios({
          url,
          method: 'GET',
          responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(filePath);
        fileResponse.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        return null;
      }
    }
    
    // Download assets in parallel for speed
    const downloadPromises = [];
    const downloadTasks = [];
    
    // Download boxart
    if (gameData.headerImageUrl) {
      const boxartPath = path.join(gameDir, 'boxart.jpg');
      downloadTasks.push({ type: 'boxart', promise: downloadFile(gameData.headerImageUrl, boxartPath) });
      downloadPromises.push(downloadTasks[downloadTasks.length - 1].promise);
    }
    
    // Download banner
    if (gameData.headerImageUrl) {
      const bannerPath = path.join(gameDir, 'banner.jpg');
      downloadTasks.push({ type: 'banner', promise: downloadFile(gameData.headerImageUrl, bannerPath) });
      downloadPromises.push(downloadTasks[downloadTasks.length - 1].promise);
    }
    
    // Download trailer if available
    if (gameData.trailerUrl) {
      const trailerPath = path.join(gameDir, 'trailer.webm');
      downloadTasks.push({ type: 'trailer', promise: downloadFile(gameData.trailerUrl, trailerPath) });
      downloadPromises.push(downloadTasks[downloadTasks.length - 1].promise);
      
      // Update trailer URL to local path
      gameData.trailerUrl = `games/${folderName}/trailer.webm`;
    }
    
    // Process and download description images
    if (gameData.description) {
      let processedDescription = gameData.description;
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      let match;
      let descImgIndex = 1;
      
      while ((match = imgRegex.exec(gameData.description)) !== null) {
        const imageUrl = match[1];
        if (imageUrl.startsWith('http')) {
          const imageName = `description-image-${descImgIndex}.jpg`;
          const imagePath = path.join(descImagesDir, imageName);
          
          // Replace URL in description with local path
          processedDescription = processedDescription.replace(
            imageUrl, 
            `games/${folderName}/description-images/${imageName}`
          );
          
          // Download image
          downloadTasks.push({ 
            type: 'description-image', 
            promise: downloadFile(imageUrl, imagePath) 
          });
          downloadPromises.push(downloadTasks[downloadTasks.length - 1].promise);
          
          descImgIndex++;
        }
      }
      
      // Update description with local paths
      gameData.description = processedDescription;
    }
    
    // Download screenshots
    // Get Steam API data to extract screenshot URLs
    const steamResponse = await axios.get(`https://n8n.irawrz.tv/webhook/steam-api?appids=${gameData.steamAppId}`);
    
    if (steamResponse.data && 
        steamResponse.data[gameData.steamAppId] && 
        steamResponse.data[gameData.steamAppId].success) {
      
      const steamData = steamResponse.data[gameData.steamAppId].data;
      const screenshots = steamData.screenshots || [];
      
      // Make sure gameData.screenshots exists
      if (!gameData.screenshots || !Array.isArray(gameData.screenshots)) {
        gameData.screenshots = [];
      }
      
      // Download each screenshot
      for (let i = 0; i < Math.min(screenshots.length, 10); i++) {
        const screenshot = screenshots[i];
        const screenshotName = `screenshot${i+1}.jpg`;
        const screenshotPath = path.join(screenshotsDir, screenshotName);
        
        if (screenshot && screenshot.path_full) {
          downloadTasks.push({ 
            type: 'screenshot', 
            index: i,
            promise: downloadFile(screenshot.path_full, screenshotPath) 
          });
          downloadPromises.push(downloadTasks[downloadTasks.length - 1].promise);
          
          // Add screenshot filename to game data
          if (i >= gameData.screenshots.length) {
            gameData.screenshots.push(screenshotName);
          } else {
            gameData.screenshots[i] = screenshotName;
          }
        }
      }
    }
    
    // Wait for all downloads to complete
    await Promise.allSettled(downloadPromises);
    
    console.log(`Downloaded ${downloadTasks.length} assets for ${gameData.name}`);
    
    // Save game info.json
    const gameInfoPath = path.join(gameDir, 'info.json');
    await fs.writeJson(gameInfoPath, gameData, { spaces: 2 });
    
    // Update games.json
    const games = loadGamesData();
    
    // Check if game already exists
    const existingGameIndex = games.findIndex(g => g.id === gameData.id);
    
    if (existingGameIndex !== -1) {
      // Update existing game
      games[existingGameIndex] = gameData;
    } else {
      // Add new game
      games.push(gameData);
    }
    
    saveGamesData(games);
    
    res.json({
      success: true,
      message: 'Game created successfully',
      game: gameData
    });
    
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Error creating game', details: error.message });
  }
});

// API to update game
app.put('/api/games/:id', async (req, res) => {
  const { id } = req.params;
  const updatedGame = req.body;
  
  if (!updatedGame) {
    return res.status(400).json({ error: 'Invalid game data' });
  }
  
  try {
    const games = loadGamesData();
    const existingGameIndex = games.findIndex(g => g.id === id);
    
    if (existingGameIndex === -1) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Update the game data
    games[existingGameIndex] = {
      ...games[existingGameIndex],
      ...updatedGame,
      id // Ensure ID stays the same
    };
    
    // Save back to games.json
    saveGamesData(games);
    
    // Update info.json in the game directory
    const gameDir = path.join(GAMES_DIR, games[existingGameIndex].folder);
    const gameInfoPath = path.join(gameDir, 'info.json');
    
    await fs.writeJson(gameInfoPath, games[existingGameIndex], { spaces: 2 });
    
    res.json({
      success: true,
      message: 'Game updated successfully',
      game: games[existingGameIndex]
    });
    
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Error updating game', details: error.message });
  }
});

// API to delete game
app.delete('/api/games/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const games = loadGamesData();
    const gameIndex = games.findIndex(g => g.id === id);
    
    if (gameIndex === -1) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const gameFolder = games[gameIndex].folder;
    
    // Remove from games.json
    games.splice(gameIndex, 1);
    saveGamesData(games);
    
    // Optional: Remove game directory
    if (req.query.removeFiles === 'true' && gameFolder) {
      const gameDir = path.join(GAMES_DIR, gameFolder);
      await fs.remove(gameDir);
    }
    
    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Error deleting game', details: error.message });
  }
});

// API to upload game files
app.post('/api/games/:id/files', async (req, res) => {
  const { id } = req.params;
  
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files were uploaded' });
  }
  
  try {
    const games = loadGamesData();
    const game = games.find(g => g.id === id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const gameDir = path.join(GAMES_DIR, game.folder);
    
    // Process each uploaded file
    const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const fileResults = [];
    
    for (const file of uploadedFiles) {
      const fileName = file.name;
      const filePath = path.join(gameDir, fileName);
      
      // Move the file to the game directory
      await file.mv(filePath);
      
      // Get file size
      const fileSize = await getFileSize(filePath);
      
      // Add to game's downloadFiles array if it doesn't already exist
      if (!game.downloadFiles) {
        game.downloadFiles = [];
      }
      
      const existingFileIndex = game.downloadFiles.findIndex(f => f.filename === fileName);
      
      // Get file type
      let fileType = 'unknown';
      const extension = path.extname(fileName).toLowerCase().replace('.', '');
      
      if (['exe', 'msi', 'dmg', 'app'].includes(extension)) {
        fileType = 'application';
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        fileType = 'archive';
      } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
        fileType = 'document';
      }
      
      if (existingFileIndex !== -1) {
        // Update existing file
        game.downloadFiles[existingFileIndex] = {
          ...game.downloadFiles[existingFileIndex],
          name: game.downloadFiles[existingFileIndex].name || fileName,
          filename: fileName,
          size: fileSize,
          type: fileType
        };
      } else {
        // Add new file
        game.downloadFiles.push({
          name: fileName,
          filename: fileName,
          size: fileSize,
          type: fileType
        });
      }
      
      fileResults.push({
        filename: fileName,
        size: fileSize,
        type: fileType
      });
    }
    
    // Update game data
    const gameIndex = games.findIndex(g => g.id === id);
    games[gameIndex] = game;
    saveGamesData(games);
    
    // Update info.json
    const gameInfoPath = path.join(gameDir, 'info.json');
    await fs.writeJson(gameInfoPath, game, { spaces: 2 });
    
    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: fileResults
    });
    
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Error uploading files', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Game Portal server running on port ${PORT}`);
});