/**
 * cornychat-integration.js - Add CornyChatIntegration iframe to Relay World
 * Creates a collapsible iframe window that can be dragged around
 */

const CornyChatIntegration = {
  container: null,
  iframe: null,
  isMinimized: false,
  isDragging: false,
  
  init: function() {
    console.log("[CornyChatIntegration] Initializing...");
    
    // Create iframe container
    this.createIframe();
    
    // Add button to mobile menu if it exists
    this.addMobileMenuButton();
    
    console.log("[CornyChatIntegration] Initialized");
  },
  
  createIframe: function() {
    // Check if container already exists
    if (document.getElementById('cornychat-container')) {
      console.log("[CornyChatIntegration] Container already exists");
      this.container = document.getElementById('cornychat-container');
      this.iframe = document.querySelector('#cornychat-container iframe');
      return;
    }
    
    // Create iframe container
    const container = document.createElement('div');
    container.id = 'cornychat-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.width = '350px';
    container.style.height = '500px';
    container.style.zIndex = '10000';
    container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    container.style.border = '4px solid var(--color-dark)';
    container.style.borderRadius = '5px';
    container.style.backgroundColor = 'var(--color-medium)';
    container.style.transition = 'all 0.3s ease';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.classList.add('hide'); // Start hidden
    
    // Create header with controls
    const header = document.createElement('div');
    header.style.backgroundColor = 'var(--color-medium)';
    header.style.color = 'var(--color-very-light)';
    header.style.padding = '5px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.style.borderBottom = '2px solid var(--color-dark)';
    header.innerHTML = '<span>CornyChatIntegration</span>';
    
    // Add minimize and close buttons
    const controls = document.createElement('div');
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.marginRight = '5px';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.background = 'none';
    minimizeBtn.style.color = 'var(--color-very-light)';
    minimizeBtn.style.fontSize = '18px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.onclick = this.minimizeIframe.bind(this);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'none';
    closeBtn.style.color = 'var(--color-very-light)';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = this.closeIframe.bind(this);
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(controls);
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'https://cornychat.com/relayworld';
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 30px)';
    iframe.style.border = 'none';
    iframe.style.flexGrow = '1';
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(iframe);
    
    // Add to body
    document.body.appendChild(container);
    
    // Make draggable
    this.makeDraggable(container, header);
    
    // Store reference
    this.container = container;
    this.iframe = iframe;
    
    // Add minimized indicator
    this.createMinimizedIndicator();
  },
  
  createMinimizedIndicator: function() {
    // Create minimized indicator (shown when iframe is minimized)
    const indicator = document.createElement('div');
    indicator.id = 'cornychat-indicator';
    indicator.innerHTML = '💬';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.right = '10px';
    indicator.style.width = '40px';
    indicator.style.height = '40px';
    indicator.style.backgroundColor = 'var(--color-medium)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '50%';
    indicator.style.display = 'flex';
    indicator.style.justifyContent = 'center';
    indicator.style.alignItems = 'center';
    indicator.style.cursor = 'pointer';
    indicator.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    indicator.style.fontSize = '20px';
    indicator.style.zIndex = '10000';
    indicator.style.transition = 'all 0.3s ease';
    indicator.classList.add('hide'); // Start hidden
    
    // Add click event to restore
    indicator.addEventListener('click', () => {
      this.restoreIframe();
    });
    
    document.body.appendChild(indicator);
  },
  
  addMobileMenuButton: function() {
    // Add a button to open CornyChatIntegration from mobile menu
    const mobileSection = document.getElementById('mobile-cornychat-section');
    if (!mobileSection) return;
    
    const openButton = document.getElementById('open-cornychat-btn');
    if (openButton) {
      openButton.addEventListener('click', () => {
        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !mobileMenu.classList.contains('hide')) {
          mobileMenu.classList.add('hide');
          const hamburgerBtn = document.getElementById('mobile-menu-toggle');
          if (hamburgerBtn) {
            hamburgerBtn.classList.remove('active');
          }
        }
        
        // Show CornyChatIntegration
        this.showIframe();
      });
    }
  },
  
  minimizeIframe: function() {
    if (!this.container) return;
    
    // Hide container
    this.container.classList.add('hide');
    
    // Show indicator
    const indicator = document.getElementById('cornychat-indicator');
    if (indicator) {
      indicator.classList.remove('hide');
    }
    
    this.isMinimized = true;
  },
  
  restoreIframe: function() {
    if (!this.container) return;
    
    // Show container
    this.container.classList.remove('hide');
    
    // Hide indicator
    const indicator = document.getElementById('cornychat-indicator');
    if (indicator) {
      indicator.classList.add('hide');
    }
    
    this.isMinimized = false;
  },
  
  closeIframe: function() {
    if (!this.container) return;
    
    // Hide both container and indicator
    this.container.classList.add('hide');
    
    const indicator = document.getElementById('cornychat-indicator');
    if (indicator) {
      indicator.classList.add('hide');
    }
  },
  
  showIframe: function() {
    if (!this.container) {
      this.createIframe();
    }
    
    // Show container
    this.container.classList.remove('hide');
    
    // Hide indicator
    const indicator = document.getElementById('cornychat-indicator');
    if (indicator) {
      indicator.classList.add('hide');
    }
    
    this.isMinimized = false;
  },
  
  makeDraggable: function(elmnt, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown.bind(this);
    header.ontouchstart = dragTouchStart.bind(this);
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Get the mouse cursor position at startup
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      this.isDragging = true;
      
      // Set dragging class
      elmnt.classList.add('dragging');
      
      // Call a function whenever the cursor moves
      document.onmousemove = elementDrag.bind(this);
      
      // Call a function when mouse is released
      document.onmouseup = closeDragElement.bind(this);
    }
    
    function dragTouchStart(e) {
      e.preventDefault();
      
      // Get the touch position at startup
      const touch = e.touches[0];
      pos3 = touch.clientX;
      pos4 = touch.clientY;
      
      this.isDragging = true;
      
      // Set dragging class
      elmnt.classList.add('dragging');
      
      // Call a function whenever the touch moves
      document.ontouchmove = elementTouchDrag.bind(this);
      
      // Call a function when touch ends
      document.ontouchend = closeTouchDragElement.bind(this);
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Calculate the new cursor position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // Set the element's new position while keeping it within viewport bounds
      const newTop = elmnt.offsetTop - pos2;
      const newLeft = elmnt.offsetLeft - pos1;
      
      // Constrain to window boundaries
      if (newTop > 0 && newTop < window.innerHeight - 30) {
        elmnt.style.top = newTop + "px";
      }
      
      if (newLeft > 0 && newLeft < window.innerWidth - 100) {
        elmnt.style.left = newLeft + "px";
      }
    }
    
    function elementTouchDrag(e) {
      e.preventDefault();
      
      const touch = e.touches[0];
      
      // Calculate the new touch position
      pos1 = pos3 - touch.clientX;
      pos2 = pos4 - touch.clientY;
      pos3 = touch.clientX;
      pos4 = touch.clientY;
      
      // Set the element's new position while keeping it within viewport bounds
      const newTop = elmnt.offsetTop - pos2;
      const newLeft = elmnt.offsetLeft - pos1;
      
      // Constrain to window boundaries
      if (newTop > 0 && newTop < window.innerHeight - 30) {
        elmnt.style.top = newTop + "px";
      }
      
      if (newLeft > 0 && newLeft < window.innerWidth - 100) {
        elmnt.style.left = newLeft + "px";
      }
    }
    
    function closeDragElement() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
      
      this.isDragging = false;
      
      // Remove dragging class
      elmnt.classList.remove('dragging');
    }
    
    function closeTouchDragElement() {
      // Stop moving when touch ends
      document.ontouchend = null;
      document.ontouchmove = null;
      
      this.isDragging = false;
      
      // Remove dragging class
      elmnt.classList.remove('dragging');
    }
  }
};

// Export the CornyChatIntegration
export default CornyChatIntegration;
