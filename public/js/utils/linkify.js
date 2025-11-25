export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function isValidUrl(url) {
    if (!url) return false;
    
    try {
        const currentOrigin = window.location.origin;
        const currentHost = window.location.hostname;
        let normalizedUrl = url.trim();
        
        if (normalizedUrl.startsWith("/")) {
            return true;
        }
        
        if (normalizedUrl.toLowerCase().startsWith("www.")) {
            const wwwHost = normalizedUrl.split("/")[0];
            const hostWithoutWww = wwwHost.replace(/^www\./i, "");
            const currentHostWithoutWww = currentHost.replace(/^www\./i, "");
            
            if (hostWithoutWww === currentHostWithoutWww || wwwHost === currentHost) {
                normalizedUrl = `http://${normalizedUrl}`;
            } else {
                return false;
            }
        }
        
        const urlObj = new URL(normalizedUrl, currentOrigin);
        
        const allowedProtocols = ["http:", "https:"];
        if (!allowedProtocols.includes(urlObj.protocol.toLowerCase())) {
            return false;
        }
        
        const urlHost = urlObj.hostname.toLowerCase();
        const currentHostLower = currentHost.toLowerCase();
        const urlHostWithoutWww = urlHost.replace(/^www\./, "");
        const currentHostWithoutWww = currentHostLower.replace(/^www\./, "");
        
        if (urlHost !== currentHostLower && urlHostWithoutWww !== currentHostWithoutWww) {
            return false;
        }
        
        const dangerousPatterns = [
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /file:/i,
            /about:/i,
        ];
        
        const urlString = normalizedUrl.toLowerCase();
        for (const pattern of dangerousPatterns) {
            if (pattern.test(urlString)) {
                return false;
            }
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

export function linkify(text) {
    if (!text) return "";
    
    const escapedText = escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*[^\s<>"']*|\/[^\s<>"']*)/gi;
    
    return escapedText.replace(urlRegex, (url) => {
        if (!isValidUrl(url)) {
            return url;
        }
        
        let href = url.trim();
        
        if (href.startsWith("/")) {
            // Keep as is
        } else if (href.toLowerCase().startsWith("www.")) {
            href = `http://${href}`;
        }
        
        const safeHref = escapeHtml(href);
        const safeUrl = escapeHtml(url);
        
        return `<a href="${safeHref}" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${safeUrl}</a>`;
    });
}
