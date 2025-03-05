/**
 * direct-messaging.js - Handles direct messages between users
 * Implements NIP-04 encrypted messages for secure communication
 */

const DirectMessaging = {
  conversations: {}, // Store conversations by pubkey
  
  init: function() {
    console.log("[DirectMessaging] Initializing...");
    this.setupUI();
    this.subscribeToDirectMessages();
    console.log("[DirectMessaging] Initialized");
  },
  
  setupUI: function() {
    // Add direct message UI to user popup
    const userPopup = document.getElementById('user-popup');
    if (!userPopup) return;
    
    // Check if direct message UI already exists
    if (document.getElementById('direct-message-container')) return;
    
    // Create direct message container
    const dmContainer = document.createElement('div');
    dmContainer.id = 'direct-message-container';
    dmContainer.className = 'hide';
    dmContainer.innerHTML = `
      <div class="dm-header">
        <h4>Direct Messages</h4>
      </div>
      <div id="direct-message-content"></div>
      <div class="dm-input">
        <textarea id="dm-message" placeholder="Type your message..."></textarea>
        <button id="send-dm-button" class="pixel-button">Send</button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #direct-message-container {
        margin-top: 15px;
        border-top: 2px solid var(--color-medium);
        padding-top: 15px;
      }
      
      #direct-message-content {
        max-height: 200px;
        overflow-y: auto;
        margin: 10px 0;
        padding: 10px;
        background-color: var(--color-lighter);
        border: 2px solid var(--color-dark);
      }
      
      .dm-message {
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 5px;
        max-width: 80%;
        position: relative;
      }
      
      .dm-message.from-me {
        background-color: var(--color-medium);
        color: var(--color-very-light);
        margin-left: auto;
      }
      
      .dm-message.from-them {
        background-color: var(--color-light);
        color: var(--color-dark);
      }
      
      .dm-content {
        word-break: break-word;
      }
      
      .dm-timestamp {
        font-size: 10px;
        text-align: right;
        margin-top: 5px;
        opacity: 0.7;
      }
      
      .dm-input {
        display: flex;
        gap: 10px;
      }
      
      #dm-message {
        flex: 1;
        height: 60px;
        resize: none;
      }
      
      /* Empty conversation state */
      .dm-empty-state {
        text-align: center;
        padding: 20px;
        color: var(--color-medium);
        font-style: italic;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to user popup
    userPopup.appendChild(dmContainer);
    
    // Add event listeners
    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
      chatButton.addEventListener('click', this.toggleDirectMessageUI.bind(this));
    }
    
    const sendButton = document.getElementById('send-dm-button');
    if (sendButton) {
      sendButton.addEventListener('click', this.sendDirectMessage.bind(this));
    }
    
    const messageInput = document.getElementById('dm-message');
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendDirectMessage();
        }
      });
    }
  },
  
  toggleDirectMessageUI: function() {
    const dmContainer = document.getElementById('direct-message-container');
    if (!dmContainer) return;
    
    dmContainer.classList.toggle('hide');
    
    if (!dmContainer.classList.contains('hide')) {
      // Focus message input
      const messageInput = document.getElementById('dm-message');
      if (messageInput) messageInput.focus();
      
      // Load previous messages
      const userPopup = document.getElementById('user-popup');
      if (userPopup) {
        const pubkey = userPopup.dataset.pubkey;
        if (pubkey) {
          this.loadConversation(pubkey);
        }
      }
    }
  },
  
  loadConversation: function(pubkey) {
    const messageContent = document.getElementById('direct-message-content');
    if (!messageContent) return;
    
    // Clear previous messages
    messageContent.innerHTML = '';
    
    // Check if we have stored messages for this pubkey
    const conversation = this.conversations[pubkey] || [];
    
    if (conversation.length === 0) {
      // No messages yet, show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'dm-empty-state';
      emptyState.textContent = 'Start a new conversation';
      messageContent.appendChild(emptyState);
    } else {
      // Render the conversation
      conversation.forEach(msg => {
        this.renderDirectMessage(msg.sender, msg.content, msg.fromMe, msg.timestamp);
      });
      
      // Scroll to bottom
      messageContent.scrollTop = messageContent.scrollHeight;
    }
  },
  
  renderDirectMessage: function(sender, content, fromMe, timestamp) {
    const messageContent = document.getElementById('direct-message-content');
    if (!messageContent) return;
    
    // Convert timestamp to Date object if it's a number
    const messageTime = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `dm-message ${fromMe ? 'from-me' : 'from-them'}`;
    
    // Message content
    const contentElement = document.createElement('div');
    contentElement.className = 'dm-content';
    contentElement.textContent = content;
    messageElement.appendChild(contentElement);
    
    // Timestamp
    const timestampElement = document.createElement('div');
    timestampElement.className = 'dm-timestamp';
    timestampElement.textContent = messageTime ? messageTime.toLocaleTimeString() : new Date().toLocaleTimeString();
    messageElement.appendChild(timestampElement);
    
    // Add to message container
    messageContent.appendChild(messageElement);
    
    // Remove empty state if it exists
    const emptyState = messageContent.querySelector('.dm-empty-state');
    if (emptyState) emptyState.remove();
    
    // Scroll to bottom
    messageContent.scrollTop = messageContent.scrollHeight;
  },
  
  sendDirectMessage: function() {
    const userPopup = document.getElementById('user-popup');
    if (!userPopup) return;
    
    const pubkey = userPopup.dataset.pubkey;
    if (!pubkey) return;
    
    const messageInput = document.getElementById('dm-message');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Store the message locally first
    this.storeMessage(pubkey, message, true);
    
    // Clear input
    messageInput.value = '';
    
    // Send the message via Nostr
    if (Nostr && Nostr.publishDirectMessage) {
      Nostr.publishDirectMessage(pubkey, message)
        .then(() => {
          console.log("[DirectMessaging] Message sent successfully");
        })
        .catch(error => {
          console.error("[DirectMessaging] Failed to send message:", error);
          if (UI && UI.showToast) {
            UI.showToast("Failed to send direct message", "error");
          }
        });
    } else {
      console.error("[DirectMessaging] Nostr module not fully initialized");
      if (UI && UI.showToast) {
        UI.showToast("Cannot send message: Nostr not fully initialized", "error");
      }
    }
  },
  
  storeMessage: function(pubkey, content, fromMe, timestamp = Date.now()) {
    // Initialize conversation if it doesn't exist
    if (!this.conversations[pubkey]) {
      this.conversations[pubkey] = [];
    }
    
    // Add message to conversation
    this.conversations[pubkey].push({
      sender: fromMe ? Player.pubkey : pubkey,
      content,
      fromMe,
      timestamp
    });
    
    // Render the message
    this.renderDirectMessage(fromMe ? Player.pubkey : pubkey, content, fromMe, timestamp);
  },
  
  subscribeToDirectMessages: function() {
    if (!Nostr || !Nostr.subscribe || !Player || !Player.pubkey) {
      console.error("[DirectMessaging] Nostr module or Player not initialized");
      return;
    }
    
    // Subscribe to direct messages addressed to the player
    if (Nostr.activeExplorerRelay && Nostr.explorerRelays) {
      const relay = Nostr.explorerRelays.get(Nostr.activeExplorerRelay);
      
      if (relay) {
        const filters = [{ 
          kinds: [4], // Direct messages
          "#p": [Player.pubkey] // Tagged with our pubkey
        }];
        
        try {
          Nostr.subscribe(
            relay,
            filters,
            (event) => this.processDirectMessage(event),
            () => console.log("[DirectMessaging] Direct messages subscription complete")
          );
          
          console.log("[DirectMessaging] Subscribed to direct messages");
        } catch (error) {
          console.error("[DirectMessaging] Failed to subscribe to direct messages:", error);
        }
      }
    }
  },
  
  processDirectMessage: function(event) {
    if (!event || !event.pubkey || event.pubkey === Player.pubkey) return;
    
    // Try to decrypt message
    if (Nostr && Nostr.decryptMessage) {
      Nostr.decryptMessage(event.content, event.pubkey)
        .then(decrypted => {
          if (!decrypted) return;
          
          // Store the decrypted message
          this.storeMessage(event.pubkey, decrypted, false, event.created_at * 1000);
          
          // Show notification if not already viewing this conversation
          const userPopup = document.getElementById('user-popup');
          const dmContainer = document.getElementById('direct-message-container');
          
          // If not already viewing this conversation, show notification
          if (!userPopup || 
              userPopup.dataset.pubkey !== event.pubkey || 
              userPopup.classList.contains('hide') || 
              dmContainer.classList.contains('hide')) {
            
            const user = Nostr.getUser(event.pubkey);
            const username = user?.profile?.name || Utils.formatPubkey(event.pubkey, { short: true });
            
            if (UI && UI.showToast) {
              UI.showToast(`New message from ${username}`, "info");
            }
            
            // Play notification sound
            if (UI && UI.playSound) {
              UI.playSound('chat');
            }
          }
        })
        .catch(error => {
          console.error("[DirectMessaging] Failed to decrypt message:", error);
        });
    }
  }
};

// Export the DirectMessaging module
export default DirectMessaging;
