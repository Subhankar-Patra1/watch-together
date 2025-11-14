// Global YouTube API loader
class YouTubeAPILoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.callbacks = [];
  }

  load() {
    return new Promise((resolve, reject) => {
      // If already loaded, resolve immediately
      if (this.isLoaded && window.YT && window.YT.Player) {
        resolve(window.YT);
        return;
      }

      // Add callback to queue
      this.callbacks.push({ resolve, reject });

      // If already loading, just wait
      if (this.isLoading) {
        return;
      }

      // Start loading
      this.isLoading = true;

      // Check if script already exists
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        this.waitForAPI();
        return;
      }

      // Load the script
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onload = () => this.waitForAPI();
      tag.onerror = () => this.handleError(new Error('Failed to load YouTube API'));
      
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Set global callback
      window.onYouTubeIframeAPIReady = () => {
        this.handleAPIReady();
      };
    });
  }

  waitForAPI() {
    const checkAPI = () => {
      if (window.YT && window.YT.Player) {
        this.handleAPIReady();
      } else {
        setTimeout(checkAPI, 50);
      }
    };
    checkAPI();
  }

  handleAPIReady() {
    this.isLoaded = true;
    this.isLoading = false;
    
    // Resolve all pending callbacks
    this.callbacks.forEach(({ resolve }) => {
      resolve(window.YT);
    });
    this.callbacks = [];
  }

  handleError(error) {
    this.isLoading = false;
    
    // Reject all pending callbacks
    this.callbacks.forEach(({ reject }) => {
      reject(error);
    });
    this.callbacks = [];
  }
}

// Global instance
const youtubeAPI = new YouTubeAPILoader();

export default youtubeAPI;