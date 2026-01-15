import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Plus, RefreshCw } from 'lucide-react'
import { db } from '@/lib/firebase.js'
import { collection, addDoc } from 'firebase/firestore'

function RandomCodeGenerator({ onCodeAdded }) {
  const [generatedCode, setGeneratedCode] = useState("")
  const [points, setPoints] = useState(100)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const generateAndAddCode = async () => {
    setIsLoading(true)
    setMessage("")
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let newCode = ''
    const length = 8 // You can adjust the length of the code
    for (let i = 0; i < length; i++) {
      newCode += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setGeneratedCode(newCode)

    if (isNaN(parseInt(points)) || parseInt(points) <= 0) {
      setMessage("Points must be a positive number.")
      setIsLoading(false)
      return
    }

    try {
      await addDoc(collection(db, 'challengeCodes'), {
        code: newCode,
        points: parseInt(points),
        createdAt: new Date().toISOString(),
        type: 'random',
        used: false // Initialize as not used
      })
      setMessage(`Code '${newCode}' with ${points} points added successfully!`)
      setGeneratedCode("") // Clear generated code after adding
      setPoints(100) // Reset points to default
      if (onCodeAdded) {
        onCodeAdded(); // Notify parent component to reload codes
      }
    } catch (error) {
      console.error('Error adding challenge code:', error)
      setMessage('Error adding code to Firebase.')
    }
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <RefreshCw className="h-5 w-5 mr-2" />
          Generate Random Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="generatedCode">Generated Code</Label>
          <Input
            id="generatedCode"
            value={generatedCode}
            readOnly
            className="font-mono text-base sm:text-lg text-center"
            placeholder="Click 'Generate' to create a code"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="points">Points for this Code</Label>
          <Input
            id="points"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            min="1"
            disabled={isLoading}
            className="text-center"
          />
        </div>

        <Button onClick={generateAndAddCode} className="w-full" disabled={isLoading} size="lg">
          {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
          Generate New Code
        </Button>

        {message && (
          <div className={`p-3 rounded-lg text-sm break-words ${
            message.includes("success") ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RandomCodeGenerator

