/**
 * note-publisher.js
 * Handles publishing and rendering of notes (kind 1 events)
 */

const NotePublisher = {
  init: function() {
    console.log("[NotePublisher] Initializing...");
    this.setupUI();
    this.enhanceNoteRendering();
    console.log("[NotePublisher] Initialized");
  },
  
  setupUI: function() {
    // Add note publishing UI to player profile
    const playerProfile = document.getElementById('player-profile');
    if (!playerProfile) return;
    
    // Check if note publisher already exists
    if (document.getElementById('note-publisher')) return;
    
    // Create note publisher container
    const publisherContainer = document.createElement('div');
    publisherContainer.id = 'note-publisher';
    publisherContainer.className = 'note-publisher';
    publisherContainer.innerHTML = `
      <button id="new-note-button" class="action-button">Publish Note</button>
    `;
    
    // Add to player profile
    playerProfile.appendChild(publisherContainer);
    
    // Create note publishing modal
    const modal = document.createElement('div');
    modal.id = 'note-publish-modal';
    modal.className = 'modal hide';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Publish Note</h3>
          <button id="note-modal-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <textarea id="note-content" placeholder="What's on your mind?"></textarea>
          <div class="note-attachments">
            <button id="add-image-button" class="pixel-button">Add Image</button>
            <input type="file" id="image-upload" accept="image/*" style="display: none;">
            <div id="image-preview"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="publish-note-button" class="primary-button">Publish</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .note-publisher {
        margin-top: 10px;
      }
      
      #note-publish-modal .modal-content {
        background-color: var(--color-light);
        border: 6px solid var(--color-dark);
        width: 80%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.3);
      }
      
      #note-content {
        width: 100%;
        min-height: 150px;
        margin-bottom: 15px;
        resize: vertical;
      }
      
      .note-attachments {
        margin-top: 10px;
      }
      
      #image-preview {
        margin-top: 10px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      #image-preview img {
        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
      }
      
      /* Enhanced note rendering */
      .user-note-content {
        white-space: pre-wrap;
      }
      
      .note-media {
        margin-top: 10px;
        cursor: pointer;
      }
      
      .note-media img {
        max-width: 100%;
        max-height: 200px;
        border: 2px solid var(--color-dark);
        cursor: pointer;
      }
      
      .note-media video,
      .note-media audio {
        max-width: 100%;
      }
      
      .media-expanded {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 20000;
      }
      
      .media-expanded img {
        max-width: 90%;
        max-height: 90%;
        border: none;
      }
      
      .media-expanded .close-button {
        position: absolute;
        top: 20px;
        right: 20px;
        background: var(--color-dark);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .note-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
      
      .note-action-button {
        padding: 5px 10px;
        font-size: 10px;
        background: var(--color-medium);
        color: var(--color-very-light);
        border: 1px solid var(--color-dark);
        cursor: pointer;
      }
      
      .note-action-button:hover {
        background: var(--color-dark);
      }
      
      .note-replies {
        margin-left: 20px;
        margin-top: 10px;
        padding-left: 10px;
        border-left: 2px solid var(--color-medium);
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(modal);
    
    // Add event listeners
    const newNoteButton = document.getElementById('new-note-button');
    if (newNoteButton) {
      newNoteButton.addEventListener('click', this.showNoteModal.bind(this));
    }
    
    const closeButton = document.getElementById('note-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideNoteModal.bind(this));
    }
    
    const publishButton = document.getElementById('publish-note-button');
    if (publishButton) {
      publishButton.addEventListener('click', this.publishNote.bind(this));
    }
    
    const addImageButton = document.getElementById('add-image-button');
    if (addImageButton) {
      addImageButton.addEventListener('click', () => {
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.click();
      });
    }
    
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
      imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
    }
  },
  
  showNoteModal: function() {
    const modal = document.getElementById('note-publish-modal');
    if (modal) modal.classList.remove('hide');
    
    // Clear previous content
    const noteContent = document.getElementById('note-content');
    if (noteContent) noteContent.value = '';
    
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) imagePreview.innerHTML = '';
  },
  
  hideNoteModal: function() {
    const modal = document.getElementById('note-publish-modal');
    if (modal) modal.classList.add('hide');
  },
  
  handleImageUpload: function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      if (UI && UI.showToast) {
        UI.showToast("Please select an image file", "error");
      }
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const imagePreview = document.getElementById('image-preview');
      if (imagePreview) {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        imagePreview.dataset.imageData = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  },
  
  publishNote: function() {
    if (!Player || !Player.pubkey) {
      if (UI && UI.showToast) {
        UI.showToast("You must be logged in to publish notes", "error");
      }
      return;
    }
    
    const noteContent = document.getElementById('note-content');
    if (!noteContent) return;
    
    const content = noteContent.value.trim();
    if (!content) {
      if (UI && UI.showToast) {
        UI.showToast("Note content cannot be empty", "error");
      }
      return;
    }
    
    // Get image data if any
    const imagePreview = document.getElementById('image-preview');
    let imageData = null;
    if (imagePreview && imagePreview.dataset.imageData) {
      imageData = imagePreview.dataset.imageData;
    }
    
    // Prepare content - if image is included, use proper format with metadata tags
    let finalContent = content;
    const tags = [
      ["client", "relay-world"],
      ["game", "relay-world"] // Add a game tag to identify this is from the Relay World game
    ];
    
    // Add image data if present
    if (imageData) {
      // Check if data URL
      if (imageData.startsWith('data:image/')) {
        finalContent = content;
        tags.push(["image", imageData]);
      }
    }
    
    // Create note event
    const event = {
      kind: 1, // Regular note kind
      content: finalContent,
      tags: tags,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Show loader
    const publishButton = document.getElementById('publish-note-button');
    if (publishButton) {
      publishButton.disabled = true;
      publishButton.textContent = "Publishing...";
    }
    
    // Get active explorer relay for publishing
    if (Nostr && Nostr.explorerRelays && Nostr.activeExplorerRelay) {
      const relay = Nostr.explorerRelays.get(Nostr.activeExplorerRelay);
      
      if (relay) {
        Nostr.publishEvent(relay, event)
          .then(publishedEvent => {
            console.log("[NotePublisher] Note published successfully", publishedEvent);
            if (UI && UI.showToast) {
              UI.showToast("Note published successfully", "success");
            }
            this.hideNoteModal();
            
            // Also add to local user notes
            if (Nostr && Nostr.users && Nostr.users.has(Player.pubkey)) {
              const user = Nostr.users.get(Player.pubkey);
              
              // Initialize notes array if it doesn't exist
              if (!user.notes) {
                user.notes = [];
              }
              
              user.notes.unshift({
                id: publishedEvent.id,
                content: publishedEvent.content,
                created_at: publishedEvent.created_at,
                tags: publishedEvent.tags
              });
              
              // Update UI if user popup is open and showing current user
              const userPopup = document.getElementById('user-popup');
              if (userPopup && userPopup.dataset.pubkey === Player.pubkey && typeof UI !== 'undefined') {
                if (typeof UI.updateUserNotes === 'function') {
                  UI.updateUserNotes(Player.pubkey);
                }
              }
            }
          })
          .catch(error => {
            console.error("[NotePublisher] Failed to publish note:", error);
            if (UI && UI.showToast) {
              UI.showToast(`Failed to publish note: ${error.message}`, "error");
            }
          })
          .finally(() => {
            // Reset button
            if (publishButton) {
              publishButton.disabled = false;
              publishButton.textContent = "Publish";
            }
          });
      } else {
        if (UI && UI.showToast) {
          UI.showToast("No active explorer relay to publish to", "error");
        }
        if (publishButton) {
          publishButton.disabled = false;
          publishButton.textContent = "Publish";
        }
      }
    } else {
      if (UI && UI.showToast) {
        UI.showToast("Nostr module not initialized", "error");
      }
      if (publishButton) {
        publishButton.disabled = false;
        publishButton.textContent = "Publish";
      }
    }
  },
  
  enhanceNoteRendering: function() {
    // Override UI.updateUserNotes to improve note rendering
    if (UI && typeof UI.updateUserNotes === 'function') {
      const originalUpdateUserNotes = UI.updateUserNotes;
      
      UI.updateUserNotes = function(pubkey) {
        const user = Nostr.getUser(pubkey);
        if (!user) return;
        
        const notesContainer = document.getElementById('user-notes');
        if (!notesContainer) return;
        
        notesContainer.innerHTML = '';
        
        if (!user.notes || user.notes.length === 0) {
          notesContainer.innerHTML = '<div class="no-notes">No recent notes found</div>';
          return;
        }
        
        // Get unique notes by id to avoid duplicates
        const uniqueNotes = [];
        const seenIds = new Set();
        
        for (const note of user.notes) {
          if (!seenIds.has(note.id)) {
            uniqueNotes.push(note);
            seenIds.add(note.id);
          }
        }
        
        for (let i = 0; i < Math.min(uniqueNotes.length, 5); i++) {
          const note = uniqueNotes[i];
          const noteElement = document.createElement('div');
          noteElement.className = 'user-note';
          noteElement.dataset.noteId = note.id;
          
          // Main content
          const contentElement = document.createElement('div');
          contentElement.className = 'user-note-content';
          contentElement.textContent = note.content;
          noteElement.appendChild(contentElement);
          
          // Process tags for media
          if (note.tags) {
            // Look for image tags
            const imageTags = note.tags.filter(tag => tag[0] === 'image');
            if (imageTags.length > 0) {
              const mediaElement = document.createElement('div');
              mediaElement.className = 'note-media';
              
              imageTags.forEach(tag => {
                const imageUrl = tag[1];
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = "Media";
                img.addEventListener('click', (e) => {
                  e.stopPropagation();
                  NotePublisher.expandMedia(img.src);
                });
                mediaElement.appendChild(img);
              });
              
              noteElement.appendChild(mediaElement);
            }
          }
          
          // Timestamp
          const timestampElement = document.createElement('div');
          timestampElement.className = 'user-note-timestamp';
          
          if (typeof Utils !== 'undefined' && typeof Utils.formatDate === 'function') {
            timestampElement.textContent = Utils.formatDate(note.created_at);
          } else {
            const date = new Date(note.created_at * 1000);
            timestampElement.textContent = date.toLocaleString();
          }
          
          noteElement.appendChild(timestampElement);
          
          // Note actions (reply, etc.)
          const actionsElement = document.createElement('div');
          actionsElement.className = 'note-actions';
          
          const replyButton = document.createElement('button');
          replyButton.className = 'note-action-button';
          replyButton.textContent = 'Reply';
          replyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showReplyDialog(note, pubkey);
          });
          
          actionsElement.appendChild(replyButton);
          noteElement.appendChild(actionsElement);
          
          notesContainer.appendChild(noteElement);
        }
      }.bind(this); // Ensure 'this' refers to NotePublisher
    }
  },
  
  expandMedia: function(src) {
    // Create expanded view
    const expandedContainer = document.createElement('div');
    expandedContainer.className = 'media-expanded';
    
    const expandedImage = document.createElement('img');
    expandedImage.src = src;
    expandedImage.alt = "Expanded media";
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      expandedContainer.remove();
    });
    
    expandedContainer.appendChild(expandedImage);
    expandedContainer.appendChild(closeButton);
    
    // Add to body
    document.body.appendChild(expandedContainer);
    
    // Close on click outside image
    expandedContainer.addEventListener('click', (e) => {
      if (e.target === expandedContainer) {
        expandedContainer.remove();
      }
    });
  },
  
  showReplyDialog: function(originalNote, authorPubkey) {
    // Create a modal for replying
    const replyModal = document.createElement('div');
    replyModal.className = 'modal';
    replyModal.id = 'reply-modal';
    
    // Get author username
    let authorName = "User";
    const author = Nostr.getUser(authorPubkey);
    if (author && author.profile && author.profile.name) {
      authorName = author.profile.name;
    } else if (typeof Utils !== 'undefined' && typeof Utils.formatPubkey === 'function') {
      authorName = Utils.formatPubkey(authorPubkey, { short: true });
    }
    
    replyModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Reply to ${authorName}</h3>
          <button id="reply-modal-close" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="original-note">
            <div class="user-note-content">${originalNote.content}</div>
          </div>
          <textarea id="reply-content" placeholder="Write your reply..."></textarea>
        </div>
        <div class="modal-footer">
          <button id="send-reply-button" class="primary-button">Reply</button>
        </div>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(replyModal);
    
    // Add event listeners
    const closeButton = document.getElementById('reply-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        replyModal.remove();
      });
    }
    
    const sendButton = document.getElementById('send-reply-button');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        const replyContent = document.getElementById('reply-content');
        if (!replyContent || !replyContent.value.trim()) {
          if (UI && UI.showToast) {
            UI.showToast("Reply cannot be empty", "error");
          }
          return;
        }
        
        this.publishReply(originalNote, authorPubkey, replyContent.value.trim());
        replyModal.remove();
      });
    }
  },
  
  publishReply: function(originalNote, authorPubkey, content) {
    if (!Player || !Player.pubkey) {
      if (UI && UI.showToast) {
        UI.showToast("You must be logged in to reply", "error");
      }
      return;
    }
    
    // Create reply event (kind 1 with e tag for the original note)
    const replyEvent = {
      kind: 1,
      content: content,
      tags: [
        ["e", originalNote.id, "", "reply"],
        ["p", authorPubkey],
        ["client", "relay-world"],
        ["game", "relay-world"]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: Player.pubkey
    };
    
    // Get active explorer relay for publishing
    if (Nostr && Nostr.explorerRelays && Nostr.activeExplorerRelay) {
      const relay = Nostr.explorerRelays.get(Nostr.activeExplorerRelay);
      
      if (relay) {
        Nostr.publishEvent(relay, replyEvent)
          .then(publishedEvent => {
            console.log("[NotePublisher] Reply published successfully", publishedEvent);
            if (UI && UI.showToast) {
              UI.showToast("Reply published successfully", "success");
            }
          })
          .catch(error => {
            console.error("[NotePublisher] Failed to publish reply:", error);
            if (UI && UI.showToast) {
              UI.showToast(`Failed to publish reply: ${error.message}`, "error");
            }
          });
      } else {
        if (UI && UI.showToast) {
          UI.showToast("No active explorer relay to publish to", "error");
        }
      }
    } else {
      if (UI && UI.showToast) {
        UI.showToast("Nostr module not initialized", "error");
      }
    }
  }
};

// Export the module
export default NotePublisher;
