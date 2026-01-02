export function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting message time:', error);
        return '';
    }
}