import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

class SocialMediaService {
  constructor() {
    this.facebookAppId = process.env.FACEBOOK_APP_ID;
    this.facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    this.facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    
    // Rate limiting
    this.lastPostTime = {
      facebook: 0,
      instagram: 0
    };
    this.minInterval = 60 * 60 * 1000; // 1 hour minimum between posts
  }

  async postToFacebook(content, imagePath) {
    try {
      if (!this.canPost('facebook')) {
        throw new Error('Rate limit: Too soon since last Facebook post');
      }

      const postData = {
        message: `${content.longDescription}\n\n${content.hashtags.join(' ')}`,
        access_token: this.facebookAccessToken
      };

      let response;

      if (imagePath && fs.existsSync(imagePath)) {
        // Post with image
        const mediaResponse = await this.uploadImageToFacebook(imagePath);
        
        if (mediaResponse.id) {
          postData.object_attachment = mediaResponse.id;
          response = await axios.post(`${this.baseUrl}/me/feed`, postData);
        } else {
          throw new Error('Failed to upload image to Facebook');
        }
      } else {
        // Text-only post
        response = await axios.post(`${this.baseUrl}/me/feed`, postData);
      }

      this.lastPostTime.facebook = Date.now();
      
      return {
        success: true,
        platform: 'facebook',
        postId: response.data.id,
        message: 'Posted successfully to Facebook'
      };

    } catch (error) {
      console.error('Facebook posting error:', error.message);
      return {
        success: false,
        platform: 'facebook',
        error: error.message,
        message: 'Failed to post to Facebook'
      };
    }
  }

  async uploadImageToFacebook(imagePath) {
    try {
      const form = new FormData();
      form.append('source', fs.createReadStream(imagePath));
      form.append('access_token', this.facebookAccessToken);

      const response = await axios.post(`${this.baseUrl}/me/photos`, form, {
        headers: {
          ...form.getHeaders()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading image to Facebook:', error.message);
      return { error: error.message };
    }
  }

  async postToInstagram(content, imagePath) {
    try {
      if (!this.canPost('instagram')) {
        throw new Error('Rate limit: Too soon since last Instagram post');
      }

      if (!this.instagramBusinessAccountId) {
        throw new Error('Instagram Business Account ID not configured');
      }

      let mediaId;

      if (imagePath && fs.existsSync(imagePath)) {
        // Upload image and create media container
        mediaId = await this.createInstagramMediaContainer(content, imagePath);
      } else {
        throw new Error('Instagram requires an image for posts');
      }

      if (!mediaId) {
        throw new Error('Failed to create Instagram media container');
      }

      // Publish the media
      const publishResponse = await this.publishInstagramMedia(mediaId);
      
      this.lastPostTime.instagram = Date.now();

      return {
        success: true,
        platform: 'instagram',
        postId: publishResponse.id,
        message: 'Posted successfully to Instagram'
      };

    } catch (error) {
      console.error('Instagram posting error:', error.message);
      return {
        success: false,
        platform: 'instagram',
        error: error.message,
        message: 'Failed to post to Instagram'
      };
    }
  }

  async createInstagramMediaContainer(content, imagePath) {
    try {
      // First, upload image to Facebook (Instagram uses Facebook's photo API)
      const imageUpload = await this.uploadImageToFacebook(imagePath);
      
      if (!imageUpload.id) {
        throw new Error('Failed to upload image for Instagram');
      }

      const caption = `${content.shortCaption}\n\n${content.hashtags.join(' ')}`;

      const response = await axios.post(`${this.baseUrl}/${this.instagramBusinessAccountId}/media`, {
        image_url: `https://graph.facebook.com/${imageUpload.id}/picture?access_token=${this.facebookAccessToken}`,
        caption: caption,
        access_token: this.facebookAccessToken
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating Instagram media container:', error.message);
      return null;
    }
  }

  async publishInstagramMedia(mediaId) {
    try {
      const response = await axios.post(`${this.baseUrl}/${this.instagramBusinessAccountId}/media_publish`, {
        creation_id: mediaId,
        access_token: this.facebookAccessToken
      });

      return response.data;
    } catch (error) {
      console.error('Error publishing Instagram media:', error.message);
      throw error;
    }
  }

  canPost(platform) {
    const lastPost = this.lastPostTime[platform] || 0;
    const timeSinceLastPost = Date.now() - lastPost;
    return timeSinceLastPost >= this.minInterval;
  }

  async postToAllPlatforms(content, imagePath) {
    const results = [];

    // Post to Facebook
    const facebookResult = await this.postToFacebook(content, imagePath);
    results.push(facebookResult);

    // Wait a bit between platform posts
    await this.delay(5000);

    // Post to Instagram
    const instagramResult = await this.postToInstagram(content, imagePath);
    results.push(instagramResult);

    return results;
  }

  async validateTokens() {
    const validation = {
      facebook: false,
      instagram: false,
      errors: []
    };

    // Validate Facebook token
    try {
      await axios.get(`${this.baseUrl}/me`, {
        params: { access_token: this.facebookAccessToken }
      });
      validation.facebook = true;
    } catch (error) {
      validation.errors.push(`Facebook token invalid: ${error.message}`);
    }

    // Validate Instagram Business Account
    try {
      await axios.get(`${this.baseUrl}/${this.instagramBusinessAccountId}`, {
        params: { 
          access_token: this.facebookAccessToken,
          fields: 'id,username'
        }
      });
      validation.instagram = true;
    } catch (error) {
      validation.errors.push(`Instagram account invalid: ${error.message}`);
    }

    return validation;
  }

  async getAccountInfo() {
    try {
      const info = {
        facebook: null,
        instagram: null
      };

      // Get Facebook page info
      try {
        const fbResponse = await axios.get(`${this.baseUrl}/me`, {
          params: { 
            access_token: this.facebookAccessToken,
            fields: 'id,name,link'
          }
        });
        info.facebook = fbResponse.data;
      } catch (error) {
        console.error('Error getting Facebook info:', error.message);
      }

      // Get Instagram info
      try {
        const igResponse = await axios.get(`${this.baseUrl}/${this.instagramBusinessAccountId}`, {
          params: { 
            access_token: this.facebookAccessToken,
            fields: 'id,username,profile_picture_url'
          }
        });
        info.instagram = igResponse.data;
      } catch (error) {
        console.error('Error getting Instagram info:', error.message);
      }

      return info;
    } catch (error) {
      console.error('Error getting account info:', error.message);
      return { error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock posting for testing/demo purposes
  async mockPost(content, imagePath, platform = 'both') {
    const results = [];

    if (platform === 'facebook' || platform === 'both') {
      results.push({
        success: true,
        platform: 'facebook',
        postId: `fb_mock_${Date.now()}`,
        message: 'Mock post to Facebook successful',
        content: content,
        imagePath: imagePath
      });
    }

    if (platform === 'instagram' || platform === 'both') {
      results.push({
        success: true,
        platform: 'instagram',
        postId: `ig_mock_${Date.now()}`,
        message: 'Mock post to Instagram successful',
        content: content,
        imagePath: imagePath
      });
    }

    return results;
  }
}

export default SocialMediaService;