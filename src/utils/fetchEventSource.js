// src/utils/fetchEventSource.js

/**
 * Custom implementation of EventSource that uses fetch to support POST requests
 * @param {string} url - The URL to connect to
 * @param {Object} options - Options for the fetch request
 * @returns {Object} - Methods to control the EventSource connection
 */
export function fetchEventSource(url, options = {}) {
    const { onmessage, onerror, onopen, onclose } = options;
    let controller = new AbortController();
    let isConnected = false;
    
    // Start the connection
    const start = async () => {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body,
          signal: controller.signal,
          credentials: options.credentials || 'same-origin',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        if (!response.body) {
          throw new Error('ReadableStream not supported');
        }
        
        isConnected = true;
        
        // Call onopen callback
        if (onopen) {
          onopen({ status: response.status });
        }
        
        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
          while (isConnected) {
            const { value, done } = await reader.read();
            
            if (done) {
              isConnected = false;
              if (onclose) {
                onclose();
              }
              break;
            }
            
            // Decode the value and append to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete events in the buffer
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep the incomplete event in the buffer
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Process data lines
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (onmessage) {
                  onmessage({ data });
                }
              }
            }
          }
        } catch (err) {
          if (isConnected && onerror) {
            onerror(err);
          }
          isConnected = false;
        } finally {
          if (isConnected && onclose) {
            onclose();
          }
          isConnected = false;
        }
      } catch (err) {
        if (onerror) {
          onerror(err);
        }
        isConnected = false;
      }
    };
    
    // Start the connection
    start();
    
    // Return methods to control the connection
    return {
      close: () => {
        if (isConnected) {
          isConnected = false;
          controller.abort();
        }
      }
    };
  }