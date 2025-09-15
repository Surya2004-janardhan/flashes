import sharp from 'sharp';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

class ImageService {
  constructor() {
    this.tempDir = './assets/temp';
    this.outputDir = './assets/images';
    this.defaultImageUrl = process.env.DEFAULT_IMAGE_URL || 'https://via.placeholder.com/1080x1080/3498db/ffffff?text=News+Update';
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.tempDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async downloadImage(imageUrl) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 10000
      });

      const filename = `temp_${uuidv4()}.jpg`;
      const filepath = path.join(this.tempDir, filename);
      
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading image:', error.message);
      return await this.createFallbackImage();
    }
  }

  async createFallbackImage() {
    const filename = `fallback_${uuidv4()}.jpg`;
    const filepath = path.join(this.tempDir, filename);

    // Create a simple colored background
    await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 3,
        background: { r: 52, g: 152, b: 219 } // Blue background
      }
    })
    .jpeg({ quality: 90 })
    .toFile(filepath);

    return filepath;
  }

  async processImageWithText(imagePath, textData) {
    try {
      const { headline, subtitle, timestamp } = textData;
      const outputFilename = `post_${uuidv4()}.jpg`;
      const outputPath = path.join(this.outputDir, outputFilename);

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 1080;
      const height = metadata.height || 1080;

      // Create text overlay SVG
      const textOverlay = this.createTextOverlaySVG(width, height, headline, subtitle, timestamp);
      
      // Process the image
      await sharp(imagePath)
        .resize(1080, 1080, { 
          fit: 'cover',
          position: 'center'
        })
        .composite([
          {
            input: Buffer.from(textOverlay),
            gravity: 'south'
          }
        ])
        .jpeg({ quality: 95 })
        .toFile(outputPath);

      // Clean up temp file
      if (imagePath.includes(this.tempDir)) {
        fs.unlinkSync(imagePath);
      }

      return outputPath;
    } catch (error) {
      console.error('Error processing image with text:', error.message);
      
      // Fallback: create text-only image
      return await this.createTextOnlyImage(textData);
    }
  }

  createTextOverlaySVG(width, height, headline, subtitle, timestamp) {
    const overlayHeight = Math.min(300, height * 0.3);
    const fontSize = Math.max(24, width * 0.025);
    const subtitleSize = Math.max(18, width * 0.018);
    const timestampSize = Math.max(14, width * 0.015);

    // Break headline into multiple lines if too long
    const maxCharsPerLine = Math.floor(width / (fontSize * 0.6));
    const headlineLines = this.breakTextIntoLines(headline, maxCharsPerLine);

    const yPosition = overlayHeight - 80;
    const lineHeight = fontSize + 5;

    const textElements = headlineLines.map((line, index) => {
      const y = yPosition - (headlineLines.length - 1 - index) * lineHeight;
      return `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" stroke="black" stroke-width="1">${this.escapeXml(line)}</text>`;
    }).join('');

    return `
      <svg width="${width}" height="${overlayHeight}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
            <stop offset="70%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.9);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        ${textElements}
        <text x="50%" y="${overlayHeight - 45}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${subtitleSize}" fill="white" opacity="0.9">${this.escapeXml(subtitle)}</text>
        <text x="50%" y="${overlayHeight - 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${timestampSize}" fill="white" opacity="0.7">${this.escapeXml(timestamp)}</text>
      </svg>
    `;
  }

  async createTextOnlyImage(textData) {
    const { headline, subtitle, timestamp } = textData;
    const width = 1080;
    const height = 1080;
    const outputFilename = `text_post_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, outputFilename);

    // Create a gradient background
    const backgroundSVG = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrad)" />
      </svg>
    `;

    // Create text overlay
    const fontSize = 48;
    const subtitleSize = 32;
    const timestampSize = 24;
    const maxCharsPerLine = 25;
    const headlineLines = this.breakTextIntoLines(headline, maxCharsPerLine);

    const centerY = height / 2;
    const totalTextHeight = headlineLines.length * (fontSize + 10) + 100;
    const startY = centerY - totalTextHeight / 2;

    const textElements = headlineLines.map((line, index) => {
      const y = startY + index * (fontSize + 10);
      return `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${this.escapeXml(line)}</text>`;
    }).join('');

    const textSVG = `
      <svg width="${width}" height="${height}">
        ${textElements}
        <text x="50%" y="${startY + headlineLines.length * (fontSize + 10) + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${subtitleSize}" fill="white" opacity="0.9">${this.escapeXml(subtitle)}</text>
        <text x="50%" y="${startY + headlineLines.length * (fontSize + 10) + 80}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${timestampSize}" fill="white" opacity="0.7">${this.escapeXml(timestamp)}</text>
      </svg>
    `;

    await sharp(Buffer.from(backgroundSVG))
      .composite([
        {
          input: Buffer.from(textSVG),
          gravity: 'center'
        }
      ])
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    return outputPath;
  }

  breakTextIntoLines(text, maxCharsPerLine) {
    if (!text) return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4); // Limit to 4 lines
  }

  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async createPostImage(newsItem, textData) {
    try {
      let imagePath;

      if (newsItem.imageUrl && newsItem.imageUrl !== this.defaultImageUrl) {
        imagePath = await this.downloadImage(newsItem.imageUrl);
      } else {
        imagePath = await this.createFallbackImage();
      }

      return await this.processImageWithText(imagePath, textData);
    } catch (error) {
      console.error('Error creating post image:', error.message);
      return await this.createTextOnlyImage(textData);
    }
  }

  cleanup() {
    // Clean up old temp files (older than 1 hour)
    try {
      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

export default ImageService;