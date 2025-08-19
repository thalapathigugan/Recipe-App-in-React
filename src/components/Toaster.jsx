import React, { useEffect } from 'react';

function Toaster({ message, onClose }) {
    useEffect(() => {
        if (message) {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="toaster">
        <div className="toast">{message}</div>
        </div>
    );
}

export default Toaster;
