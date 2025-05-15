// Create the overlay element if it doesn't exist
function createOverlay() {
  if (!document.getElementById('productivity-status-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'productivity-status-overlay';
    overlay.className = 'hidden';
    overlay.textContent = '';
    document.body.appendChild(overlay);
    console.log('Productivity overlay created');
  }
}

// Update the overlay status
function updateOverlayStatus(isProductive, message, size = 'small') {
  const overlay = document.getElementById('productivity-status-overlay');
  if (overlay) {
    // Remove all size classes first
    overlay.classList.remove('productive', 'unproductive', 'small', 'medium', 'large');
    
    // Add appropriate classes
    overlay.className = isProductive ? 'productive' : 'unproductive';
    overlay.classList.add(size);
    
    overlay.textContent = message;
    console.log('Overlay status updated:', message, 'size:', size);
  } else {
    // If overlay doesn't exist, create it first
    createOverlay();
    updateOverlayStatus(isProductive, message, size);
  }
}

// Remove the overlay
function removeOverlay() {
  const overlay = document.getElementById('productivity-status-overlay');
  if (overlay) {
    overlay.remove();
    console.log('Overlay removed');
  }
}

// Create the overlay when the script is injected
try {
  createOverlay();
} catch (error) {
  console.error('Error creating overlay:', error);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'updateStatus') {
      updateOverlayStatus(message.isProductive, message.message, message.size || 'small');
      sendResponse({ success: true });
    } else if (message.action === 'removeOverlay') {
      removeOverlay();
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // Keep the message channel open for async response
});

console.log('Productivity overlay script loaded'); 