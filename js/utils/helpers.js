/**
 * Helpers Utility Module for Relay World 2.0
 * Provides common utility functions
 */

const helpers = (function() {
    /**
     * Generate a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random number
     */
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random float
     */
    function randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Generate a random hex color
     * @returns {string} - Hex color string
     */
    function randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
    
    /**
     * Generate a random ID
     * @param {number} length - ID length
     * @returns {string} - Random ID
     */
    function generateId(length = 8) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        
        for (let i = 0; i < length; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return id;
    }
    
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Clamped value
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Linear interpolation between a and b
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    function lerp(a, b, t) {
        return a + (b - a) * clamp(t, 0, 1);
    }
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - Point 1 X
     * @param {number} y1 - Point 1 Y
     * @param {number} x2 - Point 2 X
     * @param {number} y2 - Point 2 Y
     * @returns {number} - Distance
     */
    function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     */
    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} - Angle in degrees
     */
    function radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
    
    /**
     * Calculate angle between two points
     * @param {number} x1 - Point 1 X
     * @param {number} y1 - Point 1 Y
     * @param {number} x2 - Point 2 X
     * @param {number} y2 - Point 2 Y
     * @returns {number} - Angle in radians
     */
    function angleBetweenPoints(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    /**
     * Delay execution for a specified time
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @param {boolean} immediate - Execute immediately
     * @returns {Function} - Debounced function
     */
    function debounce(func, wait, immediate = false) {
        let timeout;
        
        return function executedFunction(...args) {
            const context = this;
            
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            const callNow = immediate && !timeout;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(context, args);
        };
    }
    
    /**
     * Throttle a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Milliseconds limit
     * @returns {Function} - Throttled function
     */
    function throttle(func, limit) {
        let inThrottle;
        
        return function executedFunction(...args) {
            const context = this;
            
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    }
    
    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     * @returns {Array} - Shuffled array
     */
    function shuffleArray(array) {
        const newArray = [...array];
        
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        
        return newArray;
    }
    
    /**
     * Check if a string is valid JSON
     * @param {string} str - String to check
     * @returns {boolean} - True if valid JSON
     */
    function isValidJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Try to parse JSON, return defaultValue on error
     * @param {string} str - String to parse
     * @param {*} defaultValue - Default value if parsing fails
     * @returns {*} - Parsed object or default value
     */
    function tryParseJson(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return defaultValue;
        }
    }
    
    /**
     * Format a date or timestamp
     * @param {Date|number} date - Date object or timestamp
     * @param {boolean} includeTime - Include time in format
     * @returns {string} - Formatted date string
     */
    function formatDate(date, includeTime = true) {
        const d = date instanceof Date ? date : new Date(date);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        const dateStr = `${year}-${month}-${day}`;
        
        return includeTime ? `${dateStr} ${hours}:${minutes}:${seconds}` : dateStr;
    }
    
    /**
     * Format a number as a file size (KB, MB, etc)
     * @param {number} bytes - Size in bytes
     * @param {number} decimals - Decimal places
     * @returns {string} - Formatted size string
     */
    function formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }
    
    /**
     * Truncate a string to a maximum length
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add if truncated
     * @returns {string} - Truncated string
     */
    function truncateString(str, maxLength, suffix = '...') {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }
    
    /**
     * Convert a hex color to RGB
     * @param {string} hex - Hex color (with or without #)
     * @returns {Object} - {r, g, b} values
     */
    function hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse hex
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
    }
    
    /**
     * Convert RGB values to hex color
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {string} - Hex color string
     */
    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    /**
     * Escape HTML special characters
     * @param {string} html - String to escape
     * @returns {string} - Escaped string
     */
    function escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} - Cloned object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj);
        }
        
        if (obj instanceof Array) {
            return obj.map(item => deepClone(item));
        }
        
        if (obj instanceof Object) {
            const copy = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    copy[key] = deepClone(obj[key]);
                }
            }
            return copy;
        }
        
        throw new Error(`Unable to clone object of type ${typeof obj}`);
    }
    
    /**
     * Create a promise that resolves after a timeout
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} - Promise that resolves after timeout
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public API
    return {
        randomInt,
        randomFloat,
        randomColor,
        generateId,
        clamp,
        lerp,
        distance,
        degToRad,
        radToDeg,
        angleBetweenPoints,
        delay,
        debounce,
        throttle,
        shuffleArray,
        isValidJson,
        tryParseJson,
        formatDate,
        formatFileSize,
        truncateString,
        hexToRgb,
        rgbToHex,
        escapeHtml,
        deepClone,
        wait
    };
})();
