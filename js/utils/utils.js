/**
 * utils.js
 * General utility functions for Relay World
 */

import { RelayWorldCore } from '../core/relay-world-core.js';

export const Utils = {
    // Module metadata
    name: "utils",
    description: "General utility functions",
    version: "1.0.0",
    author: "Relay World Team",
    dependencies: [],
    priority: 1, // Very high priority, initialize first
    critical: true,
    
    // Module state
    initialized: false,
    
    // Initialize utilities
    init: function() {
        console.log("[Utils] Initializing utilities...");
        
        // Initialize polyfills if needed
        this._setupPolyfills();
        
        this.initialized = true;
        console.log("[Utils] Utilities initialized");
        return true;
    },
    
    // Setup polyfills if needed
    _setupPolyfills: function() {
        // Add any required polyfills here
        // Example: Add Array.flat polyfill for older browsers
        if (!Array.prototype.flat) {
            Array.prototype.flat = function(depth = 1) {
                return this.reduce(function(flat, toFlatten) {
                    return flat.concat((Array.isArray(toFlatten) && (depth > 1)) ? 
                        toFlatten.flat(depth - 1) : toFlatten);
                }, []);
            };
        }
    },
    
    // Format a number with commas
    formatNumber: function(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    // Format currency (sats)
    formatSats: function(sats) {
        return `${this.formatNumber(sats)} sats`;
    },
    
    // Generate a random ID
    randomId: function(prefix = '') {
        return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    },
    
    // Check if a string is a valid URL
    isValidUrl: function(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },
    
    // Ensure a URL starts with https:// or wss://
    ensureProtocol: function(url, protocol = 'wss://') {
        if (!url) return url;
        
        // Check if the URL already has a protocol
        if (url.startsWith('http://') || url.startsWith('https://') || 
            url.startsWith('ws://') || url.startsWith('wss://')) {
            return url;
        }
        
        return protocol + url;
    },
    
    // Check if a WebSocket URL is valid
    isValidWebSocketUrl: function(url) {
        if (!url) return false;
        
        // Ensure the URL has wss:// protocol
        const wsUrl = this.ensureProtocol(url, 'wss://');
        
        try {
            new URL(wsUrl);
            return wsUrl.startsWith('wss://') || wsUrl.startsWith('ws://');
        } catch (_) {
            return false;
        }
    },
    
    // Truncate a string with ellipsis
    truncate: function(str, maxLength = 30) {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    },
    
    // Format a timestamp
    formatTimestamp: function(timestamp, format = 'relative') {
        const date = new Date(timestamp * 1000);
        
        switch (format) {
            case 'relative':
                return this.timeAgo(date);
            case 'time':
                return date.toLocaleTimeString();
            case 'date':
                return date.toLocaleDateString();
            case 'datetime':
                return date.toLocaleString();
            case 'iso':
                return date.toISOString();
            default:
                return date.toLocaleString();
        }
    },
    
    // Format relative time (time ago)
    timeAgo: function(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) {
            return "just now";
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days}d ago`;
        }
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) {
            return `${weeks}w ago`;
        }
        
        const months = Math.floor(days / 30);
        if (months < 12) {
            return `${months}mo ago`;
        }
        
        const years = Math.floor(days / 365);
        return `${years}y ago`;
    },
    
    // Deep clone an object
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // Handle Date
        if (obj instanceof Date) {
            return new Date(obj);
        }
        
        // Handle Array
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        // Handle Object
        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = this.deepClone(obj[key]);
            }
        }
        
        return result;
    },
    
    // Sanitize HTML to prevent XSS
    sanitizeHTML: function(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    // Safely parse JSON
    safeJSONParse: function(json, fallback = null) {
        if (!json) return fallback;
        
        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('[Utils] Failed to parse JSON:', error);
            return fallback;
        }
    },
    
    // Get URL parameters
    getURLParams: function() {
        const params = {};
        
        try {
            const search = window.location.search.substring(1);
            if (!search) return params;
            
            const pairs = search.split('&');
            for (const pair of pairs) {
                const parts = pair.split('=');
                params[decodeURIComponent(parts[0])] = parts[1] ? 
                    decodeURIComponent(parts[1].replace(/\+/g, ' ')) : '';
            }
        } catch (error) {
            console.error('[Utils] Failed to parse URL parameters:', error);
        }
        
        return params;
    },
    
    // Format file size
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Convert hex color to RGB
    hexToRGB: function(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    // Convert RGB to hex color
    rgbToHex: function(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },
    
    // Generate a random color
    randomColor: function() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    },
    
    // Calculate distance between two points
    distance: function(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    // Check if a point is inside a rectangle
    pointInRect: function(x, y, rect) {
        return x >= rect.x && 
               x <= rect.x + rect.width && 
               y >= rect.y && 
               y <= rect.y + rect.height;
    },
    
    // Debounce function (limit how often a function can be called)
    debounce: function(func, wait, immediate = false) {
        let timeout;
        
        return function() {
            const context = this;
            const args = arguments;
            
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(context, args);
        };
    },
    
    // Throttle function (ensure function is called at most once in specified time)
    throttle: function(func, limit) {
        let inThrottle;
        
        return function() {
            const context = this;
            const args = arguments;
            
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Load an image and return a promise
    loadImage: function(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    },
    
    // Sleep for specified milliseconds
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Check if device is mobile
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Check if browser supports WebRTC
    supportsWebRTC: function() {
        return navigator.mediaDevices && 
               navigator.mediaDevices.getUserMedia && 
               window.RTCPeerConnection;
    },
    
    // Check if browser supports WebCrypto
    supportsWebCrypto: function() {
        return window.crypto && window.crypto.subtle;
    },
    
    // Get browser information
    getBrowserInfo: function() {
        const ua = navigator.userAgent;
        let browserName = "Unknown";
        let browserVersion = "Unknown";
        
        // Extract browser name and version
        if (ua.indexOf("Firefox") > -1) {
            browserName = "Firefox";
            browserVersion = ua.match(/Firefox\/([0-9.]+)/)[1];
        } else if (ua.indexOf("SamsungBrowser") > -1) {
            browserName = "Samsung Browser";
            browserVersion = ua.match(/SamsungBrowser\/([0-9.]+)/)[1];
        } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
            browserName = "Opera";
            browserVersion = ua.indexOf("OPR") > -1 
                ? ua.match(/OPR\/([0-9.]+)/)[1]
                : ua.match(/Opera\/([0-9.]+)/)[1];
        } else if (ua.indexOf("Edge") > -1) {
            browserName = "Edge";
            browserVersion = ua.match(/Edge\/([0-9.]+)/)[1];
        } else if (ua.indexOf("Chrome") > -1) {
            browserName = "Chrome";
            browserVersion = ua.match(/Chrome\/([0-9.]+)/)[1];
        } else if (ua.indexOf("Safari") > -1) {
            browserName = "Safari";
            browserVersion = ua.match(/Version\/([0-9.]+)/)[1];
        }
        
        return {
            name: browserName,
            version: browserVersion,
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language
        };
    },
    
    // Check if running in secure context (HTTPS)
    isSecureContext: function() {
        return window.isSecureContext === true;
    },
    
    // Safely access nested object properties
    getProperty: function(obj, path, defaultValue = undefined) {
        const keys = Array.isArray(path) ? path : path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === undefined || result === null) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result === undefined ? defaultValue : result;
    },
    
    // Set nested object property by path
    setProperty: function(obj, path, value) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const keys = Array.isArray(path) ? path : path.split('.');
        const lastKey = keys.pop();
        let current = obj;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                current[key] = {};
            } else if (typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
        return obj;
    },
    
    // Merge two objects deeply
    mergeDeep: function(target, source) {
        const isObject = item => item && typeof item === 'object' && !Array.isArray(item);
        
        if (!isObject(target) || !isObject(source)) {
            return source === undefined ? target : source;
        }
        
        const output = { ...target };
        
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = this.mergeDeep(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
        
        return output;
    },
    
    // Generate a slug from a string
    slugify: function(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/&/g, '-and-')          // Replace & with 'and'
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    },
    
    // Add commas to long numbers
    addThousandsSeparator: function(number, separator = ',') {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    },
    
    // Format percentage
    formatPercentage: function(value, decimals = 0) {
        return (value * 100).toFixed(decimals) + '%';
    },
    
    // Format a date
    formatDate: function(date, format = 'yyyy-mm-dd') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return format
            .replace('yyyy', year)
            .replace('mm', month)
            .replace('dd', day)
            .replace('hh', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    
    // Get URL query parameters as an object
    getQueryParams: function() {
        const params = {};
        const queryString = window.location.search.slice(1);
        
        if (!queryString) return params;
        
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
        
        return params;
    },
    
    // Convert object to query string
    objectToQueryString: function(obj) {
        return Object.keys(obj)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
            .join('&');
    },
    
    // Get cookie by name
    getCookie: function(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    },
    
    // Set cookie
    setCookie: function(name, value, days = 7, path = '/') {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=${path}`;
    },
    
    // Delete cookie
    deleteCookie: function(name, path = '/') {
        this.setCookie(name, '', -1, path);
    },
    
    // Check if local storage is available
    isLocalStorageAvailable: function() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    },
    
    // Safely get from local storage
    getLocalStorage: function(key, defaultValue = null) {
        if (!this.isLocalStorageAvailable()) return defaultValue;
        
        try {
            const item = localStorage.getItem(key);
            
            if (item === null) return defaultValue;
            
            try {
                // Try to parse as JSON
                return JSON.parse(item);
            } catch (e) {
                // If not valid JSON, return as is
                return item;
            }
        } catch (e) {
            console.error('[Utils] Failed to read from localStorage:', e);
            return defaultValue;
        }
    },
    
    // Safely set to local storage
    setLocalStorage: function(key, value) {
        if (!this.isLocalStorageAvailable()) return false;
        
        try {
            const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
            localStorage.setItem(key, valueToStore);
            return true;
        } catch (e) {
            console.error('[Utils] Failed to write to localStorage:', e);
            return false;
        }
    },
    
    // Remove from local storage
    removeLocalStorage: function(key) {
        if (!this.isLocalStorageAvailable()) return false;
        
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('[Utils] Failed to remove from localStorage:', e);
            return false;
        }
    },
    
    // Check if session storage is available
    isSessionStorageAvailable: function() {
        try {
            const test = 'test';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    },
    
    // Safely get from session storage
    getSessionStorage: function(key, defaultValue = null) {
        if (!this.isSessionStorageAvailable()) return defaultValue;
        
        try {
            const item = sessionStorage.getItem(key);
            
            if (item === null) return defaultValue;
            
            try {
                // Try to parse as JSON
                return JSON.parse(item);
            } catch (e) {
                // If not valid JSON, return as is
                return item;
            }
        } catch (e) {
            console.error('[Utils] Failed to read from sessionStorage:', e);
            return defaultValue;
        }
    },
    
    // Safely set to session storage
    setSessionStorage: function(key, value) {
        if (!this.isSessionStorageAvailable()) return false;
        
        try {
            const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
            sessionStorage.setItem(key, valueToStore);
            return true;
        } catch (e) {
            console.error('[Utils] Failed to write to sessionStorage:', e);
            return false;
        }
    },
    
    // Remove from session storage
    removeSessionStorage: function(key) {
        if (!this.isSessionStorageAvailable()) return false;
        
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('[Utils] Failed to remove from sessionStorage:', e);
            return false;
        }
    },
    
    // Generate a UUID
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // Escape HTML special characters
    escapeHTML: function(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, m => map[m]);
    },
    
    // Capitalize first letter of each word
    capitalize: function(text) {
        return text.replace(/\b\w/g, l => l.toUpperCase());
    },
    
    // Detect if JavaScript is enabled
    isJavaScriptEnabled: function() {
        return true; // If this function runs, JS is enabled
    },
    
    // Check if an element is visible in viewport
    isElementInViewport: function(el) {
        if (!el) return false;
        
        if (typeof el === 'string') {
            el = document.querySelector(el);
            if (!el) return false;
        }
        
        const rect = el.getBoundingClientRect();
        
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    // Copy text to clipboard
    copyToClipboard: function(text) {
        return new Promise((resolve, reject) => {
            if (!navigator.clipboard) {
                // Fallback method for older browsers
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                        resolve(true);
                    } else {
                        reject(new Error('Unable to copy'));
                    }
                } catch (err) {
                    reject(err);
                }
            } else {
                // Modern clipboard API
                navigator.clipboard.writeText(text)
                    .then(() => resolve(true))
                    .catch(err => reject(err));
            }
        });
    },
    
    // Check if a value is empty (null, undefined, empty string, empty array, empty object)
    isEmpty: function(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },
    
    // Detect device type
    getDeviceType: function() {
        const ua = navigator.userAgent;
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        
        return 'desktop';
    },
    
    // Log with timestamp and level
    log: function(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'info':
                console.info(`${prefix} ${message}`);
                break;
            case 'debug':
                console.debug(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
};