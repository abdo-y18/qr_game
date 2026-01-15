import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Plus, Download, Trash2, Copy, Check } from 'lucide-react'
import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase.js'
import { useEffect } from 'react'

const QRCodeGenerator = () => {
  const [qrCodes, setQrCodes] = useState([])
  const [newQRName, setNewQRName] = useState('')
  const [newQRPoints, setNewQRPoints] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const qrRefs = useRef({})

  useEffect(() => {
    loadQRCodes()
  }, [])

  const loadQRCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'qrCodes'))
      const codes = []
      querySnapshot.forEach((doc) => {
        codes.push({ id: doc.id, ...doc.data() })
      })
      setQrCodes(codes)
    } catch (error) {
      console.error('Error loading QR codes:', error)
      setMessage('Error loading QR codes')
    }
  }

  const generateQRCode = async () => {
    if (!newQRName.trim() || !newQRPoints) {
      setMessage('Please enter both name and points')
      return
    }

    setIsLoading(true)
    try {
      const qrData = {
        name: newQRName,
        points: parseInt(newQRPoints),
        code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        used: false
      }

      await addDoc(collection(db, 'qrCodes'), qrData)
      setNewQRName('')
      setNewQRPoints('')
      setMessage('QR code generated successfully!')
      loadQRCodes()
    } catch (error) {
      console.error('Error generating QR code:', error)
      setMessage('Error generating QR code')
    }
    setIsLoading(false)
  }

  const deleteQRCode = async (id) => {
    try {
      await deleteDoc(doc(db, 'qrCodes', id))
      setMessage('QR code deleted successfully!')
      loadQRCodes()
    } catch (error) {
      console.error('Error deleting QR code:', error)
      setMessage('Error deleting QR code')
    }
  }

  const downloadQRCode = (qrCode) => {
    const element = qrRefs.current[qrCode.id]
    if (element) {
      const url = element.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${qrCode.name}_${qrCode.points}pts.png`
      link.href = url
      link.click()
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            📱 Generate New QR Code
          </CardTitle>
          <CardDescription>
            Create QR codes for your scavenger hunt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qrName">QR Code Name</Label>
              <Input
                id="qrName"
                placeholder="e.g., Main Entrance, Lobby"
                value={newQRName}
                onChange={(e) => setNewQRName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qrPoints">Points</Label>
              <Input
                id="qrPoints"
                type="number"
                placeholder="e.g., 50"
                value={newQRPoints}
                onChange={(e) => setNewQRPoints(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') || message.includes('successfully')
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {message}
            </div>
          )}

          <Button
            onClick={generateQRCode}
            disabled={isLoading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate QR Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated QR Codes</CardTitle>
          <CardDescription>
            {qrCodes.length} QR codes created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {qrCodes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No QR codes generated yet
            </p>
          ) : (
            <div className="space-y-4">
              {qrCodes.map((qrCode) => (
                <div
                  key={qrCode.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {qrCode.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Code: {qrCode.code}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {qrCode.points} pts
                    </Badge>
                  </div>

                  <div className="flex justify-center p-3 bg-muted/30 rounded-lg">
                    <QRCodeCanvas
                      ref={(el) => (qrRefs.current[qrCode.id] = el)}
                      value={qrCode.code}
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(qrCode.code, qrCode.id)}
                      className="flex-1"
                    >
                      {copiedId === qrCode.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(qrCode)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQRCode(qrCode.id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default QRCodeGenerator
