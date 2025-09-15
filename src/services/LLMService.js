import OpenAI from 'openai';

class LLMService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
  }

  async generateSocialMediaContent(newsItem) {
    if (!this.openai) {
      console.warn('OpenAI API key not configured, using fallback content generation');
      return this.generateFallbackContent(newsItem);
    }

    try {
      const prompt = this.createPrompt(newsItem);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a social media content creator specializing in news summarization. Create engaging, accurate, and concise content for Instagram and Facebook posts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      return this.parseResponse(response);
    } catch (error) {
      console.error('Error generating content with OpenAI:', error.message);
      return this.generateFallbackContent(newsItem);
    }
  }

  createPrompt(newsItem) {
    return `
Create a social media post for the following news article:

Title: ${newsItem.title}
Description: ${newsItem.description}
Source: ${newsItem.source}

Please provide:
1. A short, engaging caption (max 150 characters) suitable for social media
2. A longer description (max 300 characters) with more context
3. 5-8 relevant hashtags (including trending and niche tags)

Format your response as JSON:
{
  "shortCaption": "...",
  "longDescription": "...",
  "hashtags": ["#tag1", "#tag2", "..."]
}
    `.trim();
  }

  parseResponse(response) {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      
      return {
        shortCaption: this.cleanText(parsed.shortCaption),
        longDescription: this.cleanText(parsed.longDescription),
        hashtags: parsed.hashtags || []
      };
    } catch {
      console.error('Error parsing LLM response, using fallback parsing');
      return this.parseTextResponse(response);
    }
  }

  parseTextResponse(response) {
    // Fallback parsing for non-JSON responses
    const lines = response.split('\n').filter(line => line.trim());
    
    let shortCaption = '';
    let longDescription = '';
    const hashtags = [];

    lines.forEach(line => {
      if (line.includes('shortCaption') || line.includes('caption')) {
        shortCaption = line.replace(/.*?[:"]/g, '').replace(/[",]/g, '').trim();
      } else if (line.includes('longDescription') || line.includes('description')) {
        longDescription = line.replace(/.*?[:"]/g, '').replace(/[",]/g, '').trim();
      } else if (line.includes('#')) {
        const tags = line.match(/#\w+/g);
        if (tags) hashtags.push(...tags);
      }
    });

    return {
      shortCaption: shortCaption || 'Breaking News Update',
      longDescription: longDescription || 'Stay informed with the latest developments.',
      hashtags: hashtags.length > 0 ? hashtags : ['#news', '#breaking', '#update']
    };
  }

  generateFallbackContent(newsItem) {
    // Fallback content generation without LLM
    const shortCaption = this.truncateText(newsItem.title, 150);
    const longDescription = this.truncateText(newsItem.description, 300);
    
    const hashtags = this.generateHashtags(newsItem);

    return {
      shortCaption,
      longDescription,
      hashtags
    };
  }

  generateHashtags(newsItem) {
    const commonTags = ['#news', '#breaking', '#update', '#today'];
    const keywords = this.extractKeywords(newsItem.title + ' ' + newsItem.description);
    
    const keywordTags = keywords
      .slice(0, 4)
      .map(keyword => `#${keyword.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    
    return [...commonTags, ...keywordTags].slice(0, 8);
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10);
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  cleanText(text) {
    if (!text) return '';
    return text.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async generateImageText(newsItem) {
    // Generate text for image overlay
    const title = this.truncateText(newsItem.title, 100);
    const source = newsItem.source || 'News Update';
    
    return {
      headline: title,
      subtitle: source,
      timestamp: new Date().toLocaleDateString()
    };
  }
}

export default LLMService;