require('dotenv').config();

const {google} = require('googleapis');
const youtube = google.youtube('v3');

async function Instance() {
  // This method looks for the GCLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS
  // environment variables.
  const auth = new google.auth.GoogleAuth({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtubepartner']
  });

  const authClient = await auth.getClient();

  console.log("Youtube Data API v3 auth client created");

  async function getCaptionSummary(videoId, language) {
    console.log(`getCaptionSummary('${videoId}', '${language}')`);
    language = language || 'en';
    const response = await youtube.captions.list({
      part: 'id, snippet',
      // fields: 'items(id,snippet(language, status, isDraft, lastUpdated))',
      videoId: videoId,
      auth: authClient
    });
    for (let caption of response.data.items) {
      if (caption.snippet.language === language)
        return caption;
    }
    return null;
  }

  async function downloadCaption(captionId) {
    console.log(`downloadCaption('${captionId}')`);
    const response = await youtube.captions.download({
      id: captionId,
      auth: authClient
    });
    return response.data;
  }

  return {
    getCaptionSummary: getCaptionSummary,
    downloadCaption: downloadCaption
  };
}

module.exports = Instance;