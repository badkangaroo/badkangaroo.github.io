const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8443;

// Function to check if IP is link-local (not routable on LAN)
function isLinkLocal(ip) {
  return ip.startsWith('169.254.');
}

// Function to check if IP is a private network address (routable on LAN)
function isPrivateNetwork(ip) {
  return ip.startsWith('10.') || 
         ip.startsWith('192.168.') || 
         ip.startsWith('172.16.') || 
         ip.startsWith('172.17.') || 
         ip.startsWith('172.18.') || 
         ip.startsWith('172.19.') || 
         ip.startsWith('172.20.') || 
         ip.startsWith('172.21.') || 
         ip.startsWith('172.22.') || 
         ip.startsWith('172.23.') || 
         ip.startsWith('172.24.') || 
         ip.startsWith('172.25.') || 
         ip.startsWith('172.26.') || 
         ip.startsWith('172.27.') || 
         ip.startsWith('172.28.') || 
         ip.startsWith('172.29.') || 
         ip.startsWith('172.30.') || 
         ip.startsWith('172.31.');
}

// Function to check if address is usable for LAN access
function isUsableAddress(addr) {
  return addr.family === 'IPv4' && 
         !addr.internal && 
         !isLinkLocal(addr.address);
}

// Function to find WiFi adapter IP address
function findWiFiIP() {
  const interfaces = os.networkInterfaces();
  
  // Debug: log all interfaces
  console.log('\n=== Network Interfaces ===');
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const type = isLinkLocal(addr.address) ? 'link-local' : 
                      isPrivateNetwork(addr.address) ? 'private' : 'public';
          console.log(`  ${name}: ${addr.address} (${type})`);
        }
      }
    }
  }
  console.log('==========================\n');
  
  // Common WiFi interface names across platforms
  const wifiPatterns = [
    /^en\d+$/,           // macOS: en0, en1, etc. (usually en0 is WiFi on MacBooks)
    /^wlan\d+$/,         // Linux: wlan0, wlan1, etc.
    /^Wi-Fi$/i,          // Windows: Wi-Fi
    /^WiFi$/i,           // Windows: WiFi
    /^Wireless/i,        // Some Windows: Wireless Network Connection
  ];
  
  // First, try to find interface with IP 10.0.1.5 (user's expected WiFi IP)
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      for (const addr of addrs) {
        if (isUsableAddress(addr) && addr.address === '10.0.1.5') {
          console.log(`Found expected WiFi IP 10.0.1.5 on interface: ${name}`);
          return addr.address;
        }
      }
    }
  }
  
  // Try to find WiFi interface by name patterns, prioritizing private network IPs
  const wifiCandidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    // Check if interface name matches WiFi patterns
    const isWiFi = wifiPatterns.some(pattern => pattern.test(name));
    
    if (isWiFi && addrs) {
      for (const addr of addrs) {
        if (isUsableAddress(addr)) {
          wifiCandidates.push({ name, addr });
        }
      }
    }
  }
  
  // Prioritize private network addresses over public ones
  wifiCandidates.sort((a, b) => {
    const aPrivate = isPrivateNetwork(a.addr.address);
    const bPrivate = isPrivateNetwork(b.addr.address);
    if (aPrivate && !bPrivate) return -1;
    if (!aPrivate && bPrivate) return 1;
    return 0;
  });
  
  if (wifiCandidates.length > 0) {
    const selected = wifiCandidates[0];
    console.log(`Found WiFi interface: ${selected.name} with IP: ${selected.addr.address}`);
    return selected.addr.address;
  }
  
  // Fallback: find any non-internal, non-link-local IPv4 address, prioritizing private networks
  const fallbackCandidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      for (const addr of addrs) {
        if (isUsableAddress(addr)) {
          fallbackCandidates.push({ name, addr });
        }
      }
    }
  }
  
  // Prioritize private network addresses
  fallbackCandidates.sort((a, b) => {
    const aPrivate = isPrivateNetwork(a.addr.address);
    const bPrivate = isPrivateNetwork(b.addr.address);
    if (aPrivate && !bPrivate) return -1;
    if (!aPrivate && bPrivate) return 1;
    return 0;
  });
  
  if (fallbackCandidates.length > 0) {
    const selected = fallbackCandidates[0];
    console.log(`WiFi adapter not found, using ${selected.name} interface with IP: ${selected.addr.address}`);
    return selected.addr.address;
  }
  
  // Last resort: use localhost
  console.log('No network interface found, using localhost');
  return 'localhost';
}

const wifiIP = findWiFiIP();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Check for SSL certificates
const certPath = path.join(__dirname, 'localhost.pem');
const keyPath = path.join(__dirname, 'localhost-key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  // Create HTTPS server
  const options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };

  https.createServer(options, app).listen(PORT, wifiIP, () => {
    console.log(`HTTPS server running on https://${wifiIP}:${PORT}`);
    console.log(`Also available at https://localhost:${PORT}`);
    console.log(`Serving files from: ${__dirname}`);
  });
} else {
  console.error('SSL certificates not found!');
  console.error(`Expected files:`);
  console.error(`  - ${certPath}`);
  console.error(`  - ${keyPath}`);
  console.error('\nTo generate self-signed certificates, run:');
  console.error('  openssl req -x509 -newkey rsa:4096 -keyout localhost-key.pem -out localhost.pem -days 365 -nodes');
  process.exit(1);
}
