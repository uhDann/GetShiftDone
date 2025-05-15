document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start-session');
  const endButton = document.getElementById('end-session');
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.querySelector('.status-indicator');
  const siteUrl = document.getElementById('site-url');
  const siteProductivityStatus = document.getElementById('site-productivity-status');
  const siteStatusIndicator = document.querySelector('.site-status-indicator');

  // Check current monitoring status
  chrome.storage.local.get(['isMonitoring'], function(result) {
    updateUI(result.isMonitoring || false);
  });

  // Get current tab info
  function updateCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        siteUrl.textContent = url.hostname || url.href;
        
        // Check if the site is productive
        chrome.runtime.sendMessage({ action: 'checkProductivity', url: tabs[0].url }, function(response) {
          if (response) {
            updateSiteStatus(response.isProductive);
          }
        });
      } else {
        siteUrl.textContent = "Unknown";
        updateSiteStatus(false);
      }
    });
  }

  // Update site status UI
  function updateSiteStatus(isProductive) {
    if (isProductive) {
      siteStatusIndicator.classList.add('productive');
      siteProductivityStatus.textContent = "Productive";
    } else {
      siteStatusIndicator.classList.remove('productive');
      siteProductivityStatus.textContent = "Unproductive";
    }
  }

  // Start session button click handler
  startButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'startMonitoring' }, function(response) {
      if (response && response.success) {
        updateUI(true);
        updateCurrentTabInfo();
      }
    });
  });

  // End session button click handler
  endButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'stopMonitoring' }, function(response) {
      if (response && response.success) {
        updateUI(false);
        siteUrl.textContent = "Not monitoring";
        siteProductivityStatus.textContent = "-";
        siteStatusIndicator.classList.remove('productive');
      }
    });
  });

  // Update UI based on monitoring status
  function updateUI(isMonitoring) {
    if (isMonitoring) {
      statusText.textContent = 'Monitoring active';
      statusIndicator.classList.add('active');
      startButton.disabled = true;
      endButton.disabled = false;
      updateCurrentTabInfo();
    } else {
      statusText.textContent = 'Monitoring inactive';
      statusIndicator.classList.remove('active');
      startButton.disabled = false;
      endButton.disabled = true;
      siteUrl.textContent = "Not monitoring";
      siteProductivityStatus.textContent = "-";
    }
  }
  
  // Update site info when popup opens
  if (statusIndicator.classList.contains('active')) {
    updateCurrentTabInfo();
  }
}); 