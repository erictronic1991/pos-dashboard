import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const CameraCapture = ({ onImageCaptured, onClose }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE = 'http://localhost:8000';

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera if available
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ blob, url: imageUrl });
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  }, [stopCamera]);

  const uploadImage = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', capturedImage.blob, 'product-photo.jpg');

      const response = await axios.post(`${API_BASE}/images/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        onImageCaptured(response.data.imageUrl);
        onClose();
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>📸 Capture Product Photo</h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '20px',
            color: '#721c24',
            width: '100%',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{
          position: 'relative',
          marginBottom: '20px'
        }}>
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '640px',
                height: '480px',
                maxWidth: '100%',
                backgroundColor: '#000',
                borderRadius: '8px'
              }}
            />
          ) : (
            <img
              src={capturedImage.url}
              alt="Captured product"
              style={{
                width: '640px',
                height: '480px',
                maxWidth: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          )}
          
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {!isStreaming && !capturedImage && (
            <button
              onClick={startCamera}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              📷 Start Camera
            </button>
          )}

          {isStreaming && (
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              📸 Capture Photo
            </button>
          )}

          {capturedImage && (
            <>
              <button
                onClick={retakePhoto}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🔄 Retake
              </button>
              <button
                onClick={uploadImage}
                disabled={isUploading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: isUploading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {isUploading ? '⏳ Uploading...' : '✅ Use This Photo'}
              </button>
            </>
          )}

          <button
            onClick={handleClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ❌ Cancel
          </button>
        </div>

        <div style={{
          marginTop: '15px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          💡 <strong>Tips:</strong> Ensure good lighting and hold the camera steady. 
          The photo will be automatically resized and optimized for your product catalog.
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;