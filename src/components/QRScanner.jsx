import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { X, Loader, AlertCircle } from 'lucide-react'

const QRScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(true)
  const [error, setError] = useState(null)
  const [scannedText, setScannedText] = useState('')

  useEffect(() => {
    if (!isScanning) return

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        disableFlip: false,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1
      },
      false
    )

    scanner.render(
      (decodedText) => {
        setScannedText(decodedText)
        setIsScanning(false)
        // Delay to show success state
        setTimeout(() => {
          onScan(decodedText)
        }, 500)
      },
      (err) => {
        if (err && err.toString().includes('NotAllowedError')) {
          setError('📷 Camera permission denied. Please allow camera access in your settings.')
        } else if (!err.toString().includes('NotFoundException')) {
          console.warn('QR scan error:', err)
        }
      }
    )

    scannerRef.current = scanner

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
      }
    }
  }, [isScanning, onScan])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0 sm:p-4">
      <Card className="w-full sm:max-w-md rounded-none sm:rounded-lg shadow-2xl">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl">📱 Scan QR Code</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Point your camera at a QR code
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-600 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Scanner Container */}
          <div className="relative w-full bg-black rounded-lg overflow-hidden border-2 border-primary/30">
            <div
              id="qr-reader"
              className="w-full"
              style={{ minHeight: '300px', maxHeight: '400px' }}
            />
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-64 h-64 border-2 border-green-400 rounded-lg opacity-50 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
              </div>
            )}
          </div>

          {/* Status Messages */}
          {!isScanning && scannedText && (
            <div className="p-3 rounded-lg text-sm bg-green-500/10 text-green-600 border border-green-500/20 text-center">
              ✅ QR Code Detected!
            </div>
          )}

          {isScanning && (
            <div className="text-center py-2">
              <Loader className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs sm:text-sm text-muted-foreground">Scanning...</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 sm:p-3">
            <p className="text-xs sm:text-sm text-blue-600 text-center">
              💡 Keep the QR code in the frame for best results
            </p>
          </div>

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full text-sm sm:text-base py-2 sm:py-2.5"
            disabled={!isScanning && scannedText}
          >
            {isScanning ? 'Cancel' : 'Close'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default QRScanner
