import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Trophy, Users, Code, CheckCircle, XCircle, Zap, Crown, Settings, Key, Menu, X, Camera } from 'lucide-react'
import AdminPanel from '@/components/AdminPanel.jsx'
import AnimatedLeaderboard from '@/components/AnimatedLeaderboard.jsx'
import QRScanner from '@/components/QRScanner.jsx'
import { db } from '@/lib/firebase.js'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore'
import './App.css'

function App() {
  const [team, setTeam] = useState(null)
  const [inviteCode, setInviteCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showAnimatedLeaderboard, setShowAnimatedLeaderboard] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [gamePaused, setGamePaused] = useState(false)
  const [showScores, setShowScores] = useState(true)

  const [validInviteCodes, setValidInviteCodes] = useState([])
  const [qrCodes, setQrCodes] = useState({})

  // Admin key
  const ADMIN_KEY = 'ADMIN2025'

  // Force dark mode and initialize
  useEffect(() => {
    document.documentElement.classList.add('dark')
    
    // Load codes from Firebase
    loadInviteCodes()
    const unsubscribeQRCodes = loadQRCodes()

    // Set up real-time leaderboard listener
    const teamsRef = collection(db, 'teams')
    const q = query(teamsRef, orderBy('points', 'desc'))
    
    const unsubscribeTeams = onSnapshot(q, (querySnapshot) => {
      const teams = []
      querySnapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() })
      })
      setLeaderboard(teams)
    })

    // Load game settings
    const loadGameSettings = async () => {
      try {
        const docRef = doc(db, "settings", "gameStatus");
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setGamePaused(docSnap.data().paused || false);
            setShowScores(docSnap.data().showScores !== false);
          }
        });
        return unsubscribe;
      } catch (error) {
        console.error("Error loading game settings:", error);
      }
    };

    const unsubscribeSettings = loadGameSettings();

    return () => {
      unsubscribeQRCodes()
      unsubscribeTeams()
      unsubscribeSettings?.then(unsub => unsub?.())
    }
  }, [])

  // Separate useEffect for team real-time updates
  useEffect(() => {
    const savedTeamId = localStorage.getItem('webChallengeTeamId')
    if (savedTeamId) {
      loadTeamFromFirestore(savedTeamId)
      
      // Set up real-time listener for current team
      const teamRef = doc(db, 'teams', savedTeamId)
      const unsubscribeTeam = onSnapshot(teamRef, (doc) => {
        if (doc.exists()) {
          const teamData = { id: doc.id, ...doc.data() }
          setTeam(teamData)
        } else {
          localStorage.removeItem('webChallengeTeamId')
          setTeam(null)
        }
      })
      
      return () => unsubscribeTeam()
    }
  }, [])

  const loadInviteCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inviteCodes'))
      const codes = []
      querySnapshot.forEach((doc) => {
        codes.push(doc.data().code)
      })
      setValidInviteCodes(codes)
    } catch (error) {
      console.error('Error loading invite codes:', error)
      setValidInviteCodes(['TEAM2025A', 'TEAM2025B', 'TEAM2025C', 'TEAM2025D', 'TEAM2025E'])
    }
  }

  const loadQRCodes = () => {
    const qrCodesRef = collection(db, 'qrCodes')
    const unsubscribe = onSnapshot(qrCodesRef, (querySnapshot) => {
      const codes = {}
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        codes[data.code] = { 
          points: data.points, 
          name: data.name,
          used: data.used || false,
          id: doc.id 
        }
      })
      setQrCodes(codes)
    }, (error) => {
      console.error('Error loading QR codes:', error)
    })
    return unsubscribe
  }

  const loadTeamFromFirestore = async (teamId) => {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId))
      if (teamDoc.exists()) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() }
        setTeam(teamData)
      } else {
        localStorage.removeItem('webChallengeTeamId')
      }
    } catch (error) {
      console.error('Error loading team:', error)
      localStorage.removeItem('webChallengeTeamId')
    }
  }

  const handleRegister = async () => {
    if (!inviteCode.trim() || !teamName.trim()) {
      setMessage('Please fill in all fields')
      return
    }

    if (!validInviteCodes.includes(inviteCode.toUpperCase())) {
      setMessage('Invalid invitation code')
      return
    }

    setIsLoading(true)
    
    try {
      // Check if invitation code is already used
      const teamsRef = collection(db, 'teams')
      const q = query(teamsRef, where('inviteCode', '==', inviteCode.toUpperCase()))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        setMessage('Invitation code already used by another team')
        setIsLoading(false)
        return
      }

      // Create new team in Firestore
      const newTeam = {
        name: teamName,
        inviteCode: inviteCode.toUpperCase(),
        points: 0,
        scannedQRCodes: [],
        registeredAt: new Date().toISOString()
      }
      
      const docRef = await addDoc(collection(db, 'teams'), newTeam)
      const teamWithId = { id: docRef.id, ...newTeam }
      
      setTeam(teamWithId)
      localStorage.setItem('webChallengeTeamId', docRef.id)
      setMessage('Team registered successfully!')
      setIsLoading(false)
    } catch (error) {
      console.error('Error registering team:', error)
      setMessage('Error registering team. Please try again.')
      setIsLoading(false)
    }
  }

  const handleQRScan = async (scannedCode) => {
    if (gamePaused) {
      setMessage('⏸️ Game is currently paused. Please try again later.')
      setShowQRScanner(false)
      return
    }

    const qrCodeData = qrCodes[scannedCode]

    if (!qrCodeData) {
      setMessage('❌ Invalid QR code. Please try again.')
      setShowQRScanner(false)
      return
    }

    if (team.scannedQRCodes && team.scannedQRCodes.includes(scannedCode)) {
      setMessage('⚠️ You have already scanned this QR code!')
      setShowQRScanner(false)
      return
    }

    try {
      const teamRef = doc(db, 'teams', team.id)
      const updatedData = {
        points: team.points + qrCodeData.points,
        scannedQRCodes: [...(team.scannedQRCodes || []), scannedCode]
      }

      await updateDoc(teamRef, updatedData)

      setMessage(`✅ Correct! +${qrCodeData.points} points for "${qrCodeData.name}"`)
      setShowQRScanner(false)
    } catch (error) {
      console.error('Error processing QR scan:', error)
      setMessage('Error processing QR code. Please try again.')
      setShowQRScanner(false)
    }
  }

  const handleAdminLogin = () => {
    if (adminKey === ADMIN_KEY) {
      setShowAdminPanel(true)
      setShowAdminLogin(false)
      setAdminKey('')
      setMessage('')
    } else {
      setMessage('Invalid admin key')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('webChallengeTeamId')
    setTeam(null)
    setMessage('')
    setInviteCode('')
    setTeamName('')
    setShowLeaderboard(false)
    setMobileMenuOpen(false)
  }

  const renderHeader = () => (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* Game Pause Banner */}
        {gamePaused && (
          <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg text-center text-orange-600 text-xs sm:text-sm font-medium">
            ⏸️ Game is currently paused
          </div>
        )}

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">QR Challenge</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">Scan codes, earn points</p>
            </div>
          </div>
          
          {team && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-2 xl:gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAdminLogin(true)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Admin Access"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant={showLeaderboard ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAnimatedLeaderboard(true)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Animated
                </Button>
                <div className="text-right border-l border-border pl-4">
                  <div className="text-sm font-medium text-foreground">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {showScores ? `${team.points} points` : '••• points'}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>

              {/* Tablet Navigation */}
              <div className="hidden md:flex lg:hidden items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {showScores ? `${team.points} pts` : '••• pts'}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="ml-2"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs font-medium text-foreground">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {showScores ? `${team.points} pts` : '••• pts'}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile/Tablet Menu */}
        {team && mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border space-y-2">
            <Button 
              variant={showLeaderboard ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setShowLeaderboard(!showLeaderboard)
                setMobileMenuOpen(false)
              }}
              className="w-full justify-start text-sm"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowAnimatedLeaderboard(true)
                setMobileMenuOpen(false)
              }}
              className="w-full justify-start text-sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Animated Leaderboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowAdminLogin(true)
                setMobileMenuOpen(false)
              }}
              className="w-full justify-start text-muted-foreground hover:text-foreground text-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin Access
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="w-full justify-start text-sm"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  )

  const renderLeaderboard = () => (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-500" />
          Live Leaderboard
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Real-time rankings of all teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
            <p className="text-sm">No teams registered yet.</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {leaderboard.map((teamData, index) => (
              <div 
                key={teamData.id} 
                className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border text-sm sm:text-base ${
                  teamData.id === team?.id ? 'bg-primary/10 border-primary/30' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index === 0 ? <Crown className="h-3 w-3 sm:h-4 sm:w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate text-xs sm:text-sm">
                      {teamData.name}
                      {teamData.id === team?.id && (
                        <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">You</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {teamData.scannedQRCodes?.length || 0} QR codes
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 flex-shrink-0 ml-2">
                  {showScores ? `${teamData.points} pts` : '••• pts'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderAdminLogin = () => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-lg sm:text-xl">
            <Key className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Admin Access
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enter admin key to access management panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminKey" className="text-sm">Admin Key</Label>
            <Input
              id="adminKey"
              type="password"
              placeholder="Enter admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="text-sm"
            />
          </div>
          
          {message && (
            <div className="p-2 sm:p-3 rounded-lg text-xs sm:text-sm bg-red-500/10 text-red-500 border border-red-500/20">
              {message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button onClick={handleAdminLogin} className="flex-1 text-sm">
              Access Admin Panel
            </Button>
            <Button variant="outline" onClick={() => {
              setShowAdminLogin(false)
              setAdminKey('')
              setMessage('')
            }} className="flex-1 text-sm">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderRegistration = () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-full text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            QR Code Challenge 2025
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Join the Challenge</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Enter your invitation code to get started</p>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-center text-lg sm:text-xl">Team Registration</CardTitle>
            <CardDescription className="text-center text-xs sm:text-sm">
              Use your unique invitation code to join the competition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-sm">Invitation Code</Label>
              <Input 
                id="inviteCode" 
                placeholder="Enter invitation code" 
                className="text-center font-mono text-base sm:text-lg"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamName" className="text-sm">Team Name</Label>
              <Input 
                id="teamName" 
                placeholder="Enter your team name" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={isLoading}
                className="text-sm sm:text-base"
              />
            </div>
            
            {message && (
              <div className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                message.includes('success') || message.includes('Correct') 
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {message}
              </div>
            )}

            <Button 
              className="w-full text-sm sm:text-base py-2 sm:py-2.5" 
              size="lg" 
              onClick={handleRegister}
              disabled={isLoading}
            >
              <Users className="h-4 w-4 mr-2" />
              {isLoading ? 'Registering...' : 'Register Team'}
            </Button>

            <div className="text-center pt-2 sm:pt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAdminLogin(true)}
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Admin Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderDashboard = () => (
    <div className="min-h-screen bg-background">
      {renderHeader()}
      
      <main className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">Welcome, {team.name}!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Scan QR codes to earn points and climb the leaderboard</p>
          </div>

          {showLeaderboard && renderLeaderboard()}

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Scanner Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Scan QR Code
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Point your camera at a QR code to scan it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {message && (
                    <div className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                      message.includes('✅') || message.includes('Correct') 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {message.includes('✅') ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="break-words">{message}</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full text-sm sm:text-base py-2 sm:py-2.5" 
                    size="lg" 
                    onClick={() => setShowQRScanner(true)}
                    disabled={gamePaused}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Open Scanner
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Progress Card */}
            <div>
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-primary mb-1">
                        {showScores ? team.points : '•••'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Points</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-primary mb-1">{team.scannedQRCodes?.length || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">QR Codes Scanned</div>
                    </div>
                  </div>

                  {team.scannedQRCodes && team.scannedQRCodes.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2">Scanned:</h4>
                      <div className="flex flex-wrap gap-1">
                        {team.scannedQRCodes.map((code) => (
                          <Badge key={code} variant="secondary" className="font-mono text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <>
      {team ? renderDashboard() : renderRegistration()}
      {showAdminLogin && renderAdminLogin()}
      {showAnimatedLeaderboard && <AnimatedLeaderboard onClose={() => setShowAnimatedLeaderboard(false)} />}
      {showQRScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => {
            setShowAdminPanel(false)
            loadInviteCodes()
            loadQRCodes()
          }} 
        />
      )}
    </>
  )
}

export default App
