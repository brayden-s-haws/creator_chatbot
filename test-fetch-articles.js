const fetch = require('node-fetch');

// Function to trigger fetching more articles
async function fetchMoreArticles() {
  try {
    console.log('Sending request to fetch more articles...');
    
    const response = await fetch('http://localhost:5000/api/fetch-more-articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Fetch more articles result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching more articles:', error);
  }
}

// Function to get system status
async function getSystemStatus() {
  try {
    console.log('Getting system status...');
    
    const response = await fetch('http://localhost:5000/api/system-status');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const status = await response.json();
    console.log('System status:', status);
    return status;
  } catch (error) {
    console.error('Error getting system status:', error);
  }
}

// Main function
async function main() {
  // Get initial system status
  await getSystemStatus();
  
  // Trigger fetch more articles
  await fetchMoreArticles();
  
  // Get updated system status
  await getSystemStatus();
}

// Run the main function
main().catch(console.error);