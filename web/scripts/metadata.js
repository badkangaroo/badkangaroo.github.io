// Function to handle exposed metadata from C++
function metadataExposed(metadata) {
    console.log('Metadata received:', metadata);
    
    // Convert metadata array to a more readable format
    const metadataInfo = {
        raw: metadata,
        // Add any additional processing or formatting here
    };
    
    // Dispatch a custom event with the metadata
    const event = new CustomEvent('metadataReceived', { detail: metadataInfo });
    document.dispatchEvent(event);
}

// Function to request metadata from C++
function requestMetadata(data) {
    // Get the exposed_metadata function from the WebAssembly module
    const exposeMetadata = Module.cwrap('expose_metadata', 'void', ['number']);
    
    // Call the function with the data
    exposeMetadata(data);
}

// Export the functions
window.metadataExposed = metadataExposed;
window.requestMetadata = requestMetadata; 