/**
 * Chat Module for Relay World 2.0
 * Handles the chat interface and message management
 */

const chat = (function() {
    // Private members
    let isInitialized = false;
    const MESSAGE_LIMIT = 100; // Maximum number of messages to keep in chat
    const messageHistory = []; // Array of message objects
    
    // Channel types
    const CHANNEL_TYPES = {
        LOCAL: 'local',
        GLOBAL: 'global',
        GUILD: 'guild',
        PRIVATE: 'private'
    };
    
    // Current active channel
    let activeChannel = CHANNEL_TYPES.LOCAL;
    
    /**
     * Initialize chat module
     */
    function initialize() {
        debug.log("Initializing chat module...");
        
        // Setup event handlers
        setupEventHandlers();
        
        isInitialized = true;
        return true;
    }
    
    /**
     * Setup event handlers
     */
    function setupEventHandlers() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        if (chatInput && sendButton) {
            // Send on Enter key
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Send on button click
            sendButton.addEventListener('click', () => {
                sendMessage();
            });
        }
        
        // Chat channel tabs (if implemented)
        const channelTabs = document.querySelectorAll('.chat-channel-tab');
        channelTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const channelType = tab.dataset.channelType;
                if (channelType) {
                    setActiveChannel(channelType);
                }
            });
        });
        
        // Chat toggle (if minimized chat is implemented)
        const chatToggle = document.getElementById('chat-toggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', toggleChat);
        }
    }
    
    /**
     * Send a chat message
     */
    function sendMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // Check for command
        if (message.startsWith('/')) {
            handleChatCommand(message);
            chatInput.value = '';
            return;
        }
        
        // Determine channel and content based on active channel
        let channelType = activeChannel;
        let content = message;
        
        // Publish message event
        events.sendChatMessage(content, channelType)
            .then(success => {
                if (success) {
                    chatInput.value = '';
                } else {
                    ui.showToast("Failed to send message", "error");
                }
            })
            .catch(error => {
                debug.error("Error sending chat message:", error);
                ui.showToast("Error sending message", "error");
            });
    }
    
    /**
     * Handle chat commands
     * @param {string} command - Command string (including /)
     */
    function handleChatCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        switch (cmd) {
            case '/global':
            case '/g':
                // Change to global chat and send message
                if (args.length > 0) {
                    const message = args.join(' ');
                    events.sendChatMessage(message, CHANNEL_TYPES.GLOBAL);
                } else {
                    setActiveChannel(CHANNEL_TYPES.GLOBAL);
                    ui.showToast("Switched to global chat", "info");
                }
                break;
            
            case '/local':
            case '/l':
                // Change to local chat and send message
                if (args.length > 0) {
                    const message = args.join(' ');
                    events.sendChatMessage(message, CHANNEL_TYPES.LOCAL);
                } else {
                    setActiveChannel(CHANNEL_TYPES.LOCAL);
                    ui.showToast("Switched to local chat", "info");
                }
                break;
            
            case '/guild':
                // Change to guild chat and send message
                if (!guild.getCurrentGuild()) {
                    ui.showToast("You are not in a guild", "error");
                    return;
                }
                
                if (args.length > 0) {
                    const message = args.join(' ');
                    events.sendChatMessage(message, CHANNEL_TYPES.GUILD);
                } else {
                    setActiveChannel(CHANNEL_TYPES.GUILD);
                    ui.showToast("Switched to guild chat", "info");
                }
                break;
            
            case '/whisper':
            case '/w':
            case '/msg':
                // Send private message
                if (args.length < 2) {
                    ui.showToast("Usage: /whisper <pubkey> <message>", "error");
                    return;
                }
                
                const recipient = args[0];
                const whisperMessage = args.slice(1).join(' ');
                
                sendPrivateMessage(recipient, whisperMessage);
                break;
            
            case '/clear':
                // Clear chat
                clearChat();
                ui.showToast("Chat cleared", "info");
                break;
            
            case '/help':
                // Show help
                showChatHelp();
                break;
            
            case '/pos':
            case '/position':
                // Share position
                sharePosition();
                break;
            
            case '/nick':
            case '/name':
                // Set display name (if implemented)
                if (args.length === 0) {
                    ui.showToast("Usage: /nick <name>", "error");
                    return;
                }
                
                setDisplayName(args.join(' '));
                break;
            
            default:
                ui.showToast(`Unknown command: ${cmd}`, "error");
        }
    }
    
    /**
     * Set the active chat channel
     * @param {string} channelType - Channel type from CHANNEL_TYPES
     */
    function setActiveChannel(channelType) {
        if (!Object.values(CHANNEL_TYPES).includes(channelType)) {
            debug.warn(`Invalid channel type: ${channelType}`);
            return;
        }
        
        // Special checks for guild channel
        if (channelType === CHANNEL_TYPES.GUILD && !guild.getCurrentGuild()) {
            ui.showToast("You are not in a guild", "error");
            return;
        }
        
        activeChannel = channelType;
        
        // Update UI to show active channel
        updateChannelUI();
    }
    
    /**
     * Update UI to reflect current active channel
     */
    function updateChannelUI() {
        // Update channel tabs if implemented
        const channelTabs = document.querySelectorAll('.chat-channel-tab');
        channelTabs.forEach(tab => {
            const channelType = tab.dataset.channelType;
            
            if (channelType === activeChannel) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update chat input placeholder
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.placeholder = `Type a message in ${activeChannel} chat...`;
        }
        
        // Update chat header if implemented
        const chatHeader = document.getElementById('chat-header');
        if (chatHeader) {
            let headerText;
            
            switch (activeChannel) {
                case CHANNEL_TYPES.LOCAL:
                    headerText = "Local Chat";
                    break;
                case CHANNEL_TYPES.GLOBAL:
                    headerText = "Global Chat";
                    break;
                case CHANNEL_TYPES.GUILD:
                    const currentGuild = guild.getCurrentGuild();
                    headerText = currentGuild ? `Guild Chat: ${currentGuild.name}` : "Guild Chat";
                    break;
                case CHANNEL_TYPES.PRIVATE:
                    headerText = "Private Messages";
                    break;
            }
            
            chatHeader.textContent = headerText;
        }
        
        // Filter messages to show only those from active channel
        filterMessages();
    }
    
    /**
     * Add a message to the chat
     * @param {string} senderPubkey - Sender's pubkey
     * @param {string} content - Message content
     * @param {string} channelType - Channel type from CHANNEL_TYPES
     * @param {string} channel - Channel identifier (region, guild, etc.)
     */
    function addMessage(senderPubkey, content, channelType, channel) {
        // Create message object
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            senderPubkey,
            content,
            channelType,
            channel,
            timestamp: Date.now(),
            isSystem: false
        };
        
        // Add to history
        messageHistory.unshift(message);
        
        // Trim history if needed
        if (messageHistory.length > MESSAGE_LIMIT) {
            messageHistory.pop();
        }
        
        // Add to UI if channel matches active channel
        if (shouldShowMessage(message)) {
            addMessageToUI(message);
        }
    }
    
    /**
     * Add a system message to the chat
     * @param {string} content - Message content
     * @param {string} channelType - Channel type from CHANNEL_TYPES
     */
    function addSystemMessage(content, channelType = CHANNEL_TYPES.LOCAL) {
        // Create message object
        const message = {
            id: `sys-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            senderPubkey: null,
            content,
            channelType,
            channel: null,
            timestamp: Date.now(),
            isSystem: true
        };
        
        // Add to history
        messageHistory.unshift(message);
        
        // Trim history if needed
        if (messageHistory.length > MESSAGE_LIMIT) {
            messageHistory.pop();
        }
        
        // Add to UI if channel matches active channel
        if (shouldShowMessage(message)) {
            addMessageToUI(message);
        }
    }
    
    /**
     * Add a message to the chat UI
     * @param {Object} message - Message object
     */
    function addMessageToUI(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.dataset.messageId = message.id;
        
        // Add classes based on message type
        if (message.isSystem) {
            messageElement.classList.add('system-message');
        } else {
            messageElement.classList.add(message.channelType + '-message');
            
            // Highlight messages from local player
            if (message.senderPubkey === nostrClient.getPubkey()) {
                messageElement.classList.add('self-message');
            }
        }
        
        // Format sender name
        let senderHTML = '';
        
        if (message.isSystem) {
            senderHTML = '<span class="sender system">System:</span>';
        } else {
            // Format differently based on channel type
            let channelPrefix = '';
            let senderClass = 'sender';
            
            switch (message.channelType) {
                case CHANNEL_TYPES.GLOBAL:
                    channelPrefix = '[Global] ';
                    senderClass += ' global';
                    break;
                case CHANNEL_TYPES.GUILD:
                    channelPrefix = '[Guild] ';
                    senderClass += ' guild';
                    break;
                case CHANNEL_TYPES.PRIVATE:
                    channelPrefix = '[PM] ';
                    senderClass += ' private';
                    break;
            }
            
            // Truncate pubkey for display
            const displayName = message.displayName || message.senderPubkey.substring(0, 8) + '...';
            
            senderHTML = `<span class="${senderClass}">${channelPrefix}${displayName}:</span>`;
        }
        
        // Set message content
        messageElement.innerHTML = `
            ${senderHTML}
            <span class="message-content">${formatMessageContent(message.content)}</span>
            <span class="message-time">${formatTime(message.timestamp)}</span>
        `;
        
        // Add click handlers for sender name (to open profile, copy pubkey, etc.)
        const senderElement = messageElement.querySelector('.sender:not(.system)');
        if (senderElement) {
            senderElement.addEventListener('click', (event) => {
                showSenderActions(message.senderPubkey, event);
            });
        }
        
        // Add to chat container at the end
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Filter messages to show only those from active channel
     */
    function filterMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Clear current messages
        chatMessages.innerHTML = '';
        
        // Filter messages for active channel
        const filteredMessages = messageHistory.filter(shouldShowMessage);
        
        // Add filtered messages to UI
        filteredMessages.forEach(message => {
            addMessageToUI(message);
        });
    }
    
    /**
     * Determine if a message should be shown in the current view
     * @param {Object} message - Message object
     * @returns {boolean} - True if message should be shown
     */
    function shouldShowMessage(message) {
        // System messages are always shown
        if (message.isSystem) return true;
        
        // Show messages matching the active channel
        return message.channelType === activeChannel;
    }
    
    /**
     * Format message content (handle links, emojis, etc.)
     * @param {string} content - Raw message content
     * @returns {string} - Formatted message content
     */
    function formatMessageContent(content) {
        // Escape HTML
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Handle links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Handle line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    /**
     * Format timestamp for display
     * @param {number} timestamp - Message timestamp
     * @returns {string} - Formatted time string
     */
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    /**
     * Show action menu for a sender
     * @param {string} pubkey - Sender's pubkey
     * @param {MouseEvent} event - Click event
     */
    function showSenderActions(pubkey, event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Create action menu
        const actionsMenu = document.createElement('div');
        actionsMenu.className = 'sender-actions-menu';
        
        // Add menu options
        actionsMenu.innerHTML = `
            <div class="action-item whisper" data-action="whisper">Message</div>
            <div class="action-item profile" data-action="profile">View Profile</div>
            <div class="action-item copy" data-action="copy">Copy Pubkey</div>
            <div class="action-item zap" data-action="zap">Send Zap</div>
        `;
        
        // Position menu near the click
        actionsMenu.style.left = `${event.clientX}px`;
        actionsMenu.style.top = `${event.clientY}px`;
        
        // Add to document
        document.body.appendChild(actionsMenu);
        
        // Handle action clicks
        actionsMenu.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (!actionItem) return;
            
            const action = actionItem.dataset.action;
            
            switch (action) {
                case 'whisper':
                    // Set chat input to private message
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) {
                        chatInput.value = `/w ${pubkey} `;
                        chatInput.focus();
                    }
                    break;
                
                case 'profile':
                    // Show profile (implement in separate module)
                    ui.showToast("Profile view not implemented yet", "info");
                    break;
                
                case 'copy':
                    // Copy pubkey to clipboard
                    navigator.clipboard.writeText(pubkey)
                        .then(() => {
                            ui.showToast("Pubkey copied to clipboard", "success");
                        })
                        .catch(() => {
                            ui.showToast("Failed to copy pubkey", "error");
                        });
                    break;
                
                case 'zap':
                    // Show zap dialog
                    lightning.showZapDialog(pubkey);
                    break;
            }
            
            // Remove menu
            actionsMenu.remove();
        });
        
        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!actionsMenu.contains(e.target)) {
                actionsMenu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        // Delay adding the event listener to prevent immediate removal
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 10);
    }
    
    /**
     * Send a private message to a recipient
     * @param {string} recipientPubkey - Recipient's pubkey
     * @param {string} message - Message content
     */
    function sendPrivateMessage(recipientPubkey, message) {
        // Not implemented - would require encryption (NIP-04)
        ui.showToast("Private messages not implemented yet", "error");
    }
    
    /**
     * Clear the chat history
     */
    function clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
    
    /**
     * Show chat help message
     */
    function showChatHelp() {
        addSystemMessage("Available commands:", activeChannel);
        addSystemMessage("/global (or /g) [message] - Send to global chat", activeChannel);
        addSystemMessage("/local (or /l) [message] - Send to local chat", activeChannel);
        addSystemMessage("/guild [message] - Send to guild chat", activeChannel);
        addSystemMessage("/whisper (or /w) <pubkey> <message> - Send private message", activeChannel);
        addSystemMessage("/clear - Clear chat history", activeChannel);
        addSystemMessage("/pos - Share your position", activeChannel);
        addSystemMessage("/help - Show this help", activeChannel);
    }
    
    /**
     * Share player position in chat
     */
    function sharePosition() {
        const pos = player.getPosition();
        const regionId = nostrClient.getRegionForPosition(pos.x, pos.y);
        
        const message = `My position: (${Math.floor(pos.x)}, ${Math.floor(pos.y)}) in region ${regionId}`;
        events.sendChatMessage(message, activeChannel);
    }
    
    /**
     * Set player display name
     * @param {string} name - New display name
     */
    function setDisplayName(name) {
        // Not implemented - would require publishing metadata event
        ui.showToast("Changing display name not implemented yet", "error");
    }
    
    /**
     * Toggle chat visibility
     */
    function toggleChat() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;
        
        chatContainer.classList.toggle('minimized');
    }
    
    // Public API
    return {
        initialize,
        addMessage,
        addSystemMessage,
        setActiveChannel,
        sendMessage,
        clearChat,
        showChatHelp,
        toggleChat,
        
        // Constants
        CHANNEL_TYPES,
        
        // Getters
        getActiveChannel: () => activeChannel,
        getMessageHistory: () => [...messageHistory]
    };
})();
