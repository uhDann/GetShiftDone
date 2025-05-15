// List of allowed domains
const ALLOWED_DOMAINS = ['amazon.com', 'salesforce.com', 'aws.amazon.com'];

// Domains with custom messages
const CUSTOM_MESSAGES = {
  'stackoverflow.com': {
    message: 'Get back to being productive',
    size: 'medium'
  },
  'github.com': {
    message: 'Get back to being productive',
    size: 'medium'
  },
  'linkedin.com': {
    message: 'Stop shitposting and get back to work',
    size: 'large'
  }
};

// Default message for unproductive sites
const DEFAULT_UNPRODUCTIVE_MESSAGE = {
  message: 'you suck',
  size: 'small'
};

// API endpoint for reporting unproductive sites
const API_ENDPOINT = 'https://example.com/unproductive';

// Monitoring state
let isMonitoring = false;
let overlayInjectedTabs = new Set(); // Track tabs where overlay is injected

// Initialize state from storage
chrome.storage.local.get(['isMonitoring'], function(result) {
  isMonitoring = result.isMonitoring || false;
});

// Function to check if a URL belongs to an allowed domain
function isAllowedDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch (e) {
    console.error('Error parsing URL:', e);
    return false;
  }
}

// Function to get custom message for a domain
function getMessageForDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    
    // Check for exact domain matches
    for (const domain in CUSTOM_MESSAGES) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return CUSTOM_MESSAGES[domain];
      }
    }
    
    // Return default message if no custom message found
    return DEFAULT_UNPRODUCTIVE_MESSAGE;
  } catch (e) {
    console.error('Error parsing URL for message:', e);
    return DEFAULT_UNPRODUCTIVE_MESSAGE;
  }
}

// Function to check if a URL is injectable
function isInjectableUrl(url) {
  return url && 
         !url.startsWith('chrome://') && 
         !url.startsWith('edge://') && 
         !url.startsWith('about:') &&
         !url.startsWith('chrome-extension://') &&
         !url.startsWith('devtools://');
}

// Function to report unproductive site to API
async function reportUnproductiveSite(url) {
  // Only report if monitoring is active
  if (!isMonitoring) return;
  
  try {
    const payload = {
      url: url,
      timestamp: new Date().toISOString(),
      reason: "unproductive_site"
    };
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    console.log('Successfully reported unproductive site:', url);
  } catch (error) {
    console.error('Failed to report unproductive site:', error);
  }
}

// Function to inject the overlay
async function injectOverlay(tabId, url) {
  // Skip if not injectable or already injected
  if (!isInjectableUrl(url) || overlayInjectedTabs.has(tabId)) {
    return;
  }
  
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['overlay.css']
    });
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['overlay.js']
    });
    
    overlayInjectedTabs.add(tabId);
    console.log('Overlay injected into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject overlay:', error);
  }
}

// Function to update the overlay status
function updateOverlayStatus(tabId, isProductive, url) {
  if (!overlayInjectedTabs.has(tabId)) {
    return; // Skip if overlay not injected
  }
  
  try {
    if (isProductive) {
      chrome.tabs.sendMessage(tabId, {
        action: 'updateStatus',
        isProductive: true,
        message: 'productive',
        size: 'small'
      }, response => {
        if (chrome.runtime.lastError) {
          // Tab might have been closed or navigated
          overlayInjectedTabs.delete(tabId);
        }
      });
    } else {
      // Get custom message for this domain
      const messageConfig = getMessageForDomain(url);
      
      chrome.tabs.sendMessage(tabId, {
        action: 'updateStatus',
        isProductive: false,
        message: messageConfig.message,
        size: messageConfig.size
      }, response => {
        if (chrome.runtime.lastError) {
          // Tab might have been closed or navigated
          overlayInjectedTabs.delete(tabId);
        }
      });
    }
  } catch (error) {
    console.error('Error sending message to tab:', error);
  }
}

// Function to handle tab updates
function handleTabUpdate(tabId, changeInfo, tab) {
  // Only proceed if monitoring is active and the URL has been updated and is complete
  if (!isMonitoring || !changeInfo.status || changeInfo.status !== 'complete' || !tab.url) {
    return;
  }
  
  // Check if URL is injectable
  if (!isInjectableUrl(tab.url)) {
    return;
  }
  
  // Inject overlay if not already injected
  injectOverlay(tabId, tab.url).then(() => {
    // Check if the domain is allowed
    const isProductive = isAllowedDomain(tab.url);
    
    // Update overlay status
    updateOverlayStatus(tabId, isProductive, tab.url);
    
    // Report if not productive
    if (!isProductive) {
      reportUnproductiveSite(tab.url);
    }
  });
}

// Function to handle tab activation
function handleTabActivation(activeInfo) {
  // Only proceed if monitoring is active
  if (!isMonitoring) return;
  
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      return;
    }
    
    // Check if URL is injectable
    if (!isInjectableUrl(tab.url)) {
      return;
    }
    
    // Inject overlay if not already injected
    injectOverlay(activeInfo.tabId, tab.url).then(() => {
      // Check if the domain is allowed
      const isProductive = isAllowedDomain(tab.url);
      
      // Update overlay status
      updateOverlayStatus(activeInfo.tabId, isProductive, tab.url);
      
      // Report if not productive
      if (!isProductive) {
        reportUnproductiveSite(tab.url);
      }
    });
  });
}

// Handle tab removal
function handleTabRemoved(tabId) {
  overlayInjectedTabs.delete(tabId);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startMonitoring') {
    isMonitoring = true;
    chrome.storage.local.set({ isMonitoring: true });
    console.log('Monitoring started');
    
    // Check current tab immediately
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url && isInjectableUrl(tabs[0].url)) {
        const tabId = tabs[0].id;
        
        // Inject overlay
        injectOverlay(tabId, tabs[0].url).then(() => {
          // Check if productive
          const isProductive = isAllowedDomain(tabs[0].url);
          updateOverlayStatus(tabId, isProductive, tabs[0].url);
          
          if (!isProductive) {
            reportUnproductiveSite(tabs[0].url);
          }
        });
      }
    });
    
    sendResponse({ success: true });
  } 
  else if (message.action === 'stopMonitoring') {
    isMonitoring = false;
    chrome.storage.local.set({ isMonitoring: false });
    console.log('Monitoring stopped');
    
    // Remove overlay from all tabs
    overlayInjectedTabs.forEach(tabId => {
      try {
        chrome.tabs.sendMessage(tabId, { action: 'removeOverlay' }, () => {
          if (!chrome.runtime.lastError) {
            console.log('Overlay removed from tab:', tabId);
          }
        });
      } catch (error) {
        console.error('Error removing overlay:', error);
      }
    });
    
    // Clear the set of injected tabs
    overlayInjectedTabs.clear();
    
    sendResponse({ success: true });
  }
  else if (message.action === 'checkProductivity') {
    if (message.url) {
      const isProductive = isAllowedDomain(message.url);
      sendResponse({ isProductive: isProductive });
    } else {
      sendResponse({ isProductive: false });
    }
    return true;
  }
  return true; // Required for async sendResponse
});

// Register event listeners
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onRemoved.addListener(handleTabRemoved);

console.log('Productivity Monitor extension initialized'); 