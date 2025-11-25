/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * Check system health and model availability.
   */
  async checkHealth() {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) {
      throw new Error('Failed to check health');
    }
    return response.json();
  },

  /**
   * Get current model configuration.
   */
  async getConfig() {
    const response = await fetch(`${API_BASE}/api/config`);
    if (!response.ok) {
      throw new Error('Failed to get config');
    }
    return response.json();
  },

  /**
   * Update model configuration.
   */
  async updateConfig(councilModels, chairmanModel) {
    const response = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        council_models: councilModels,
        chairman_model: chairmanModel,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update config');
    }
    return response.json();
  },

  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const processedEvents = new Set(); // Track processed events to prevent duplicates

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last line in buffer if it's incomplete (doesn't end with \n)
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);

            // Create a unique key for this event to prevent duplicates
            const eventKey = JSON.stringify(event);
            if (!processedEvents.has(eventKey)) {
              processedEvents.add(eventKey);
              onEvent(event.type, event);
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6);
      try {
        const event = JSON.parse(data);
        const eventKey = JSON.stringify(event);
        if (!processedEvents.has(eventKey)) {
          onEvent(event.type, event);
        }
      } catch (e) {
        // Ignore incomplete data at end of stream
      }
    }
  },
};
