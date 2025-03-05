/**
 * game-chat.js - Enhanced chat functionality for Relay World
 * Implements game chat with dedicated event kind and direct messaging
 */

const GameChat = {
  // Game chat will use kind 420420 as a dedicated kind for game chat
  GAME_CHAT_KIND: 420420,
  DIRECT_CHAT_KIND: 420421,
  
  // Message history storage
  messages: [],
  directMessages: new Map(), // Map of pubkey -> array of messages
  
  // Max number of messages to keep
  MAX_MESSAGES: 100,
  
  init: function() {
    console.log("[GameChat] Initializing...");
    
    // Setup UI elements for chat
    this.setupChatUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Subscribe to game chat events
    this.subscribeToGameChat();
    
    // Subscribe to direct messages
    this.subscribeToDirectMessages();
    
    console.log("[GameChat] Initialized");
  },
  
  setupChatUI: function() {
    // Enhance chat container with tabs for global/direct messages
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
    // Add tabs to chat container
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
      <div class="chat-tabs">
        <button class="chat-tab active" data-tab="global">Global Chat</button>
        <button class="chat-tab" data-tab="direct">Direct Messages</button>
      </div>
    `;
    
    // Insert at beginning of chat container
    chatContainer.insertBefore(chatHeader, chatContainer.firstChild);
    
    // Create direct messages container
    const directMessagesContainer = document.createElement('div');
    directMessagesContainer.id = 'direct-messages';
    directMessagesContainer.className = 'hide';
    directMessagesContainer.innerHTML = `
      <div id="direct-message-list"></div>
      <div class="dm-recipient-selector">
        <select id="dm-recipient-select">
          <option value="">Select recipient...</option>
        </select>
      </div>
    `;
    
    // Insert before the chat input wrapper
    const chatInputWrapper = document.querySelector('.chat-input-wrapper');
    if (chatInputWrapper) {
      chatContainer.insertBefore(directMessagesContainer, chatInputWrapper);
    }
    
    // Add indicator for active chat
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.setAttribute('placeholder', 'Global chat: Type a message...');
    }
  },
  
  setupEventListeners: function() {
    // Chat input focus/blur events to toggle movement control
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('focus', () => {
        if (Player) {
          Player.chatFocused = true;
          
          // Store current input state to restore later
          Player._inputState = {
            up: Player.input.up,
            down: Player.input.down,
            left: Player.input.left,
            right: Player.input.right
          };
          
          // Disable all movement while typing
          Player.input.up = false;
          Player.input.down = false;
          Player.input.left = false;
          Player.input.right = false;
        }
      });
      
      chatInput.addEventListener('blur', () => {
        if (Player) {
          Player.chatFocused = false;
          
          // Restore input state if saved
          if (Player._inputState) {
            Player.input.up = Player._inputState.up;
            Player.input.down = Player._inputState.down;
            Player.input.left = Player._inputState.left;
            Player.input.right = Player._inputState.right;
          }
        }
      });
      
      // Send message on Enter key
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
    
    // Send button click
    const sendButton = document.getElementById('send-chat-button');
    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendChatMessage());
    }
    
    // Chat tab buttons
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        chatTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Toggle visibility of chat messages and direct messages
        const chatMessages = document.getElementById('chat-messages');
        const directMessages = document.getElementById('direct-messages');
        
        if (tab.dataset.tab === 'global') {
          chatMessages.classList.remove('hide');
          directMessages.classList.add('hide');
          
          // Update chat input placeholder
          if (chatInput) {
            chatInput.setAttribute('placeholder', 'Global chat: Type a message...');
          }
        } else {
          chatMessages.classList.add('hide');
          directMessages.classList.remove('hide');
          
          // Update chat input placeholder
          if (chatInput) {
            const recipient = document.getElementById('dm-recipient-select').value;
            const recipientName = recipient ? this.getPlayerName(recipient) : 'Select recipient...';
            chatInput.setAttribute('placeholder', `Message to ${recipientName}...`);
          }
          
          // Refresh direct message list
          this.updateDirectMessageList();
        }
      });
    });
    
    // Direct message recipient select
    const dmRecipientSelect = document.getElementById('dm-recipient-select');
    if (dmRecipientSelect) {
      dmRecipientSelect.addEventListener('change', () => {
        const recipient = dmRecipientSelect.value;
        
        // Update chat input placeholder
        if (chatInput) {
          const recipientName = recipient ? this.getPlayerName(recipient) : 'Select recipient...';
          chatInput.setAttribute('placeholder', `Message to ${recipientName}...`);
        }
        
        // Load messages for selected recipient
        this.loadDirectMessagesForRecipient(recipient);
      });
    }
  },
  
  subscribeToGameChat: function() {
    if (!Nostr || !Nostr.gameRelay) {
      console.error("[GameChat] Game relay not connected, can't subscribe to game chat");
      return;
    }
    
    const filters = [{ kinds: [this.GAME_CHAT_KIND] }];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processGameChatEvent(event),
        () => console.log("[GameChat] Game chat subscription complete")
      );
      
      console.log("[GameChat] Subscribed to game chat events");
    } catch (error) {
      console.error("[GameChat] Failed to subscribe to game chat:", error);
    }
  },
  
  subscribeToDirectMessages: function() {
    if (!Nostr || !Nostr.gameRelay || !Player || !Player.pubkey) {
      console.error("[GameChat] Cannot subscribe to direct messages, missing required objects");
      return;
    }
    
    // Subscribe to direct messages where current player is in the p tag
    const filters = [
      { 
        kinds: [this.DIRECT_CHAT_KIND],
        "#p": [Player.pubkey]
      }
    ];
    
    try {
      Nostr.subscribe(
        Nostr.gameRelay,
        filters,
        (event) => this.processDirectMessageEvent(event),
        () => console.log("[GameChat] Direct messages subscription complete")
      );
      
      console.log("[GameChat] Subscribed to direct messages");
    } catch (error) {
      console.error("[GameChat] Failed to subscribe to direct messages:", error);
    }
  },
  
  processGameChatEvent: function(event) {
    if (!event || !event.pubkey) return;
    
    // Don't display our own messages again (they're added when sent)
    if (Player && event.pubkey === Player.pubkey) return;
    
    try {
      const content = event.content;
      
      // Store the message
      this.messages.push({
        id: event.id,
        pubkey: event.pubkey,
        content: content,
        timestamp: event.created_at * 1000 // Convert to milliseconds
      });
      
      // Trim message history if needed
      if (this.messages.length > this.MAX_MESSAGES) {
        this.messages.shift();
      }
      
      // Get user's name
      const username = this.getPlayerName(event.pubkey);
      
      // Add message to chat UI
      this.addChatMessageToUI(username, content);
      
      // Play notification sound if message is recent (within last 10 seconds)
      const messageAge = Math.floor(Date.now() / 1000) - event.created_at;
      if (messageAge < 10 && UI && UI.playSound) {
        UI.playSound('chat');
      }
      
    } catch (error) {
      console.error("[GameChat] Error processing game chat event:", error);
    }
  },
  
  processDirectMessageEvent: function(event) {
    if (!event || !event.pubkey || !Player || !Player.pubkey) return;
    
    try {
      const content = event.content;
      
      // Find the recipient tag (other than self)
      const recipientTags = event.tags.filter(tag => tag[0] === 'p');
      const recipientTag = recipientTags.find(tag => tag[1] !== Player.pubkey);
      
      // If no recipient found, the message might be corrupted
      if (!recipientTag && event.pubkey !== Player.pubkey) {
        console.error("[GameChat] Direct message has no valid recipient:", event);
        return;
      }
      
      // Determine the other party in the conversation (sender or recipient)
      let otherPubkey;
      
      // If we're the sender, find the recipient
      if (event.pubkey === Player.pubkey) {
        otherPubkey = recipientTag ? recipientTag[1] : null;
      } else {
        // Otherwise, the other party is the sender
        otherPubkey = event.pubkey;
      }
      
      if (!otherPubkey) {
        console.error("[GameChat] Cannot determine conversation partner for direct message:", event);
        return;
      }
      
      // Create an entry for this conversation if it doesn't exist
      if (!this.directMessages.has(otherPubkey)) {
        this.directMessages.set(otherPubkey, []);
      }
      
      // Add the message to the conversation
      const conversation = this.directMessages.get(otherPubkey);
      conversation.push({
        id: event.id,
        pubkey: event.pubkey,
        content: content,
        timestamp: event.created_at * 1000, // Convert to milliseconds
        isSent: event.pubkey === Player.pubkey
      });
      
      // Sort messages by timestamp
      conversation.sort((a, b) => a.timestamp - b.timestamp);
      
      // Trim conversation if needed
      if (conversation.length > this.MAX_MESSAGES) {
        conversation.shift();
      }
      
      // Update the UI if this conversation is active
      const dmRecipientSelect = document.getElementById('dm-recipient-select');
      if (dmRecipientSelect && dmRecipientSelect.value === otherPubkey) {
        this.loadDirectMessagesForRecipient(otherPubkey);
      }
      
      // Update direct message menu
      this.updateDirectMessageRecipients();
      
      // Play notification sound if message is recent and not from us
      const messageAge = Math.floor(Date.now() / 1000) - event.created_at;
      if (messageAge < 10 && event.pubkey !== Player.pubkey && UI && UI.playSound) {
        UI.playSound('chat');
        
        // Show toast notification
        if (UI && UI.showToast) {
          const senderName = this.getPlayerName(event.pubkey);
          UI.showToast(`New message from ${senderName}`, "info");
        }
      }
      
    } catch (error) {
      console.error("[GameChat] Error processing direct message event:", error);
    }
  },
  
  sendChatMessage: function() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Check which tab is active
    const isGlobalChat = document.querySelector('.chat-tab[data-tab="global"]').classList.contains('active');
    
    if (isGlobalChat) {
      // Send global chat message
      this.sendGlobalChatMessage(message);
    } else {
      // Send direct message
      const recipientSelect = document.getElementById('dm-recipient-select');
      if (!recipientSelect || !recipientSelect.value) {
        if (UI && UI.showToast) {
          UI.showToast("Please select a recipient for your message", "warning");
        }
        return;
      }
      
      this.sendDirectMessage(recipientSelect.value, message);
    }
    
    // Clear input
    input.value = '';
  },
  
  sendGlobalChatMessage: function(message) {
    if (!Player || !Player.pubkey || !Nostr || !Nostr.gameRelay) {
      console.error("[GameChat] Required objects not available");
      return;
    }
    
    // Create game chat event with proper tag structure
    const event = {
      kind: this.GAME_CHAT_KIND,
      content: message,
      tags: [
        ["t", "gamechat"],
        ["g", "relay-world"]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Get user's name
    const username = this.getPlayerName(Player.pubkey);
    
    // Add message to chat immediately (don't wait for relay)
    this.addChatMessageToUI(username, message, true);
    
    // Store message in history
    this.messages.push({
      pubkey: Player.pubkey,
      content: message,
      timestamp: Date.now(),
      isSent: true
    });
    
    // Increment chat messages counter
    Player.chatMessages = (Player.chatMessages || 0) + 1;
    
    // Publish event to game relay
    if (Nostr.publishEvent) {
      Nostr.publishEvent(Nostr.gameRelay, event)
        .then(() => {
          console.log("[GameChat] Game chat message published");
          
          // Update player stats
          if (Nostr.publishPlayerStats) {
            Nostr.publishPlayerStats();
          }
        })
        .catch(error => {
          console.error("[GameChat] Failed to publish game chat message:", error);
          if (UI && UI.showToast) {
            UI.showToast("Failed to send message", "error");
          }
        });
    }
  },
  
  sendDirectMessage: function(recipientPubkey, message) {
    if (!Player || !Player.pubkey || !Nostr || !Nostr.gameRelay) {
      console.error("[GameChat] Required objects not available");
      return;
    }
    
    // Create direct message event
    const event = {
      kind: this.DIRECT_CHAT_KIND,
      content: message,
      tags: [
        ["t", "directchat"],
        ["g", "relay-world"],
        ["p", recipientPubkey] // Recipient's pubkey
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Add message to conversation immediately
    if (!this.directMessages.has(recipientPubkey)) {
      this.directMessages.set(recipientPubkey, []);
    }
    
    const conversation = this.directMessages.get(recipientPubkey);
    conversation.push({
      pubkey: Player.pubkey,
      content: message,
      timestamp: Date.now(),
      isSent: true
    });
    
    // Update UI
    this.loadDirectMessagesForRecipient(recipientPubkey);
    
    // Publish event to game relay
    if (Nostr.publishEvent) {
      Nostr.publishEvent(Nostr.gameRelay, event)
        .then(() => {
          console.log("[GameChat] Direct message published");
        })
        .catch(error => {
          console.error("[GameChat] Failed to publish direct message:", error);
          if (UI && UI.showToast) {
            UI.showToast("Failed to send direct message", "error");
          }
        });
    }
  },
  
  addChatMessageToUI: function(username, message, isFromMe = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isFromMe ? 'from-me' : ''}`;
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = username;
    messageElement.appendChild(usernameSpan);
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = ` [${new Date().toLocaleTimeString()}] `;
    messageElement.appendChild(timestampSpan);
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'content';
    contentSpan.textContent = message;
    messageElement.appendChild(contentSpan);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },
  
  updateDirectMessageList: function() {
    // Update the list of available direct message recipients
    this.updateDirectMessageRecipients();
    
    // Load messages for selected recipient
    const dmRecipientSelect = document.getElementById('dm-recipient-select');
    if (dmRecipientSelect && dmRecipientSelect.value) {
      this.loadDirectMessagesForRecipient(dmRecipientSelect.value);
    } else {
      // Clear message list
      const directMessageList = document.getElementById('direct-message-list');
      if (directMessageList) {
        directMessageList.innerHTML = '<div class="no-messages">Select a recipient to view messages</div>';
      }
    }
  },
  
  updateDirectMessageRecipients: function() {
    if (!Nostr || !Nostr.users) return;
    
    const dmRecipientSelect = document.getElementById('dm-recipient-select');
    if (!dmRecipientSelect) return;
    
    // Save current selection
    const currentSelection = dmRecipientSelect.value;
    
    // Clear select
    dmRecipientSelect.innerHTML = '<option value="">Select recipient...</option>';
    
    // Add options for all users with direct messages
    const existingConversations = new Set(this.directMessages.keys());
    
    // Add all users from Nostr.users
    for (const [pubkey, user] of Nostr.users) {
      // Skip self
      if (Player && pubkey === Player.pubkey) continue;
      
      const option = document.createElement('option');
      option.value = pubkey;
      option.textContent = this.getPlayerName(pubkey);
      
      // Check if this user has unread messages
      if (existingConversations.has(pubkey)) {
        option.textContent += ' *';
        option.classList.add('has-messages');
      }
      
      dmRecipientSelect.appendChild(option);
    }
    
    // Restore selection if possible
    if (currentSelection && Array.from(dmRecipientSelect.options).some(option => option.value === currentSelection)) {
      dmRecipientSelect.value = currentSelection;
    }
  },
  
  loadDirectMessagesForRecipient: function(recipientPubkey) {
    const directMessageList = document.getElementById('direct-message-list');
    if (!directMessageList) return;
    
    // Clear message list
    directMessageList.innerHTML = '';
    
    // If no messages for this recipient, show empty state
    if (!this.directMessages.has(recipientPubkey) || this.directMessages.get(recipientPubkey).length === 0) {
      directMessageList.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
      return;
    }
    
    // Get messages for this recipient
    const messages = this.directMessages.get(recipientPubkey);
    
    // Add messages to the UI
    messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `dm-message ${message.isSent ? 'from-me' : 'from-them'}`;
      
      const contentElement = document.createElement('div');
      contentElement.className = 'dm-content';
      contentElement.textContent = message.content;
      messageElement.appendChild(contentElement);
      
      const timestampElement = document.createElement('div');
      timestampElement.className = 'dm-timestamp';
      timestampElement.textContent = new Date(message.timestamp).toLocaleTimeString();
      messageElement.appendChild(timestampElement);
      
      directMessageList.appendChild(messageElement);
    });
    
    // Scroll to bottom
    directMessageList.scrollTop = directMessageList.scrollHeight;
  },
  
  getPlayerName: function(pubkey) {
    if (!pubkey) return "Unknown";
    
    // Check if it's the current player
    if (Player && pubkey === Player.pubkey) {
      return Player.profile?.name || "You";
    }
    
    // Check Nostr users
    if (Nostr && Nostr.users && Nostr.users.has(pubkey)) {
      const user = Nostr.users.get(pubkey);
      if (user && user.profile && user.profile.name) {
        return user.profile.name;
      }
    }
    
    // Fallback to shortened pubkey
    if (Utils && Utils.formatPubkey) {
      return Utils.formatPubkey(pubkey, { short: true });
    }
    
    // Last resort
    return pubkey.slice(0, 8) + "...";
  }
};

// Export the module
export default GameChat;
