export class ConnectionMonitor {
  constructor(peerConnection) {
    this.pc = peerConnection;
    this.stats = {
      bitrate: 0,
      packetLoss: 0,
      latency: 0,
      resolution: { width: 0, height: 0 },
      framerate: 0
    };
    this.lastBytesSent = 0;
    this.lastTimestamp = 0;
    this.interval = null;
  }

  startMonitoring(callback) {
    if (this.interval) clearInterval(this.interval);
    
    this.interval = setInterval(async () => {
      if (!this.pc || this.pc.connectionState === 'closed') {
        this.stopMonitoring();
        return;
      }

      try {
        const stats = await this.pc.getStats();
        
        stats.forEach(report => {
          // Monitor outbound video (sender side)
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            const now = report.timestamp;
            const bytes = report.bytesSent;
            
            if (this.lastTimestamp) {
              const duration = (now - this.lastTimestamp) / 1000; // seconds
              const bitrate = (bytes - this.lastBytesSent) * 8 / duration; // bits per second
              this.stats.bitrate = Math.round(bitrate);
            }
            
            this.lastBytesSent = bytes;
            this.lastTimestamp = now;
            
            this.stats.framerate = report.framesPerSecond || 0;
            if (report.frameWidth) {
              this.stats.resolution = { width: report.frameWidth, height: report.frameHeight };
            }
          }
          
          // Monitor inbound video (receiver side)
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            this.stats.packetLoss = report.packetsLost || 0;
            if (report.framesPerSecond) this.stats.framerate = report.framesPerSecond;
            if (report.frameWidth) {
              this.stats.resolution = { width: report.frameWidth, height: report.frameHeight };
            }
          }
          
          // Monitor latency (candidate pair)
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            this.stats.latency = Math.round(report.currentRoundTripTime * 1000); // ms
          }
        });
        
        callback(this.stats);
      } catch (e) {
        console.warn('Error getting stats:', e);
      }
    }, 1000);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
