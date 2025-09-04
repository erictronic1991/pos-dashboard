import React from 'react';
import { useState, useRef, useEffect } from 'react';

const BarcodeScanner = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup function to stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Start camera for scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera if available
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError && onError('Unable to access camera. Please check permissions.');
    }
  };

  // Handle manual barcode input
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan && onScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // Simulate barcode detection (in a real app, you'd use a barcode scanning library)
  const handleVideoClick = () => {
    // For demo purposes, we'll use manual input
    const demoBarcode = prompt('Enter barcode (demo mode):');
    if (demoBarcode) {
      onScan && onScan(demoBarcode);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{ 
      border: '2px solid #ddd', 
      borderRadius: '8px', 
      padding: '20px', 
      margin: '10px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Barcode Scanner</h3>
      
      {/* Camera Scanner */}
      <div style={{ marginBottom: '20px' }}>
        {!isScanning ? (
          <button 
            onClick={startCamera}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Start Camera Scanner
          </button>
        ) : (
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              onClick={handleVideoClick}
              style={{
                width: '100%',
                maxWidth: '400px',
                height: '300px',
                backgroundColor: '#000',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            />
            <div style={{ marginTop: '10px' }}>
              <button 
                onClick={stopCamera}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                Stop Camera
              </button>
              <small style={{ color: '#666' }}>
                Click on video to scan (demo mode)
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div>
        <h4>Manual Barcode Entry</h4>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter barcode manually"
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Scan
          </button>
        </form>
      </div>
    </div>
  );
};

export default BarcodeScanner;