import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Settings, 
  Plus, 
  Trash2, 
  Users, 
  Code, 
  Trophy, 
  Eye, 
  EyeOff,
  Download,
  RefreshCw,
  X,
  Pause,
  Play,
  Zap,
  AlertTriangle,
  RotateCcw,
  Camera
} from 'lucide-react'
import QRCodeGenerator from './QRCodeGenerator.jsx'
import { db } from '@/lib/firebase.js'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore'

function AdminPanel({ onClose }) {
  const [inviteCodes, setInviteCodes] = useState([])
  const [teams, setTeams] = useState([])
  const [newInviteCode, setNewInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [gamePaused, setGamePaused] = useState(false)
  const [showScores, setShowScores] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    const loadGameSettings = async () => {
      try {
        const docRef = doc(db, "settings", "gameStatus");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGamePaused(docSnap.data().paused || false);
          setShowScores(docSnap.data().showScores !== false);
        } else {
          await setDoc(docRef, { paused: false, showScores: true });
        }
      } catch (error) {
        console.error("Error loading game settings:", error);
      }
    };
    loadGameSettings();
  }, []);

  const toggleGamePause = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "settings", "gameStatus");
      await updateDoc(docRef, { paused: !gamePaused });
      setGamePaused(!gamePaused);
      setMessage(`Game ${!gamePaused ? "paused" : "resumed"} successfully!`);
    } catch (error) {
      console.error("Error toggling game pause:", error);
      setMessage("Error toggling game pause.");
    }
    setIsLoading(false);
  }

  const toggleScoreVisibility = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "settings", "gameStatus");
      await updateDoc(docRef, { showScores: !showScores });
      setShowScores(!showScores);
      setMessage(`Scores ${!showScores ? "shown" : "hidden"} successfully!`);
    } catch (error) {
      console.error("Error toggling score visibility:", error);
      setMessage("Error toggling score visibility.");
    }
    setIsLoading(false);
  }

  const resetGame = async () => {
    setIsLoading(true);
    try {
      const teamsRef = collection(db, 'teams');
      const teamsSnapshot = await getDocs(teamsRef);
      
      const batch = writeBatch(db);
      teamsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      const docRef = doc(db, "settings", "gameStatus");
      await updateDoc(docRef, { paused: false, showScores: true });
      setGamePaused(false);
      setShowScores(true);

      setMessage('Game reset successfully! All teams have been deleted.');
      setShowResetConfirm(false);
      loadTeams();
    } catch (error) {
      console.error("Error resetting game:", error);
      setMessage("Error resetting game.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadInviteCodes()
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const teamsRef = collection(db, 'teams')
      const q = query(teamsRef, orderBy('points', 'desc'))
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const teamsData = []
        querySnapshot.forEach((doc) => {
          teamsData.push({ id: doc.id, ...doc.data() })
        })
        setTeams(teamsData)
      })

      return unsubscribe
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const loadInviteCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inviteCodes'))
      const codes = []
      querySnapshot.forEach((doc) => {
        codes.push({ id: doc.id, ...doc.data() })
      })
      setInviteCodes(codes)
    } catch (error) {
      console.error('Error loading invite codes:', error)
    }
  }

  const addInviteCode = async () => {
    if (!newInviteCode.trim()) {
      setMessage('Please enter an invitation code')
      return
    }

    setIsLoading(true)
    try {
      await addDoc(collection(db, 'inviteCodes'), {
        code: newInviteCode.toUpperCase(),
        used: false,
        createdAt: new Date().toISOString(),
        type: 'manual'
      })
      setNewInviteCode('')
      setMessage('Invitation code added successfully!')
      loadInviteCodes()
    } catch (error) {
      console.error('Error adding invite code:', error)
      setMessage('Error adding invitation code')
    }
    setIsLoading(false)
  }

  const deleteInviteCode = async (id) => {
    try {
      await deleteDoc(doc(db, 'inviteCodes', id))
      setMessage('Invitation code deleted successfully!')
      loadInviteCodes()
    } catch (error) {
      console.error('Error deleting invite code:', error)
      setMessage('Error deleting invitation code')
    }
  }

  const exportTeamsData = () => {
    const csvContent = [
      ['Team Name', 'Invite Code', 'Points', 'QR Codes Scanned', 'Scanned Codes', 'Registered At'],
      ...teams.map(team => [
        team.name,
        team.inviteCode,
        team.points,
        team.scannedQRCodes?.length || 0,
        team.scannedQRCodes?.join('; ') || '',
        new Date(team.registeredAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-challenge-teams-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderTopThreeLeaderboard = () => (
    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 mb-4 sm:mb-6">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-yellow-500" />
          Top 3 Teams
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Live ranking of top performers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {teams.slice(0, 3).length === 0 ? (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
              No teams registered yet
            </p>
          ) : (
            teams.slice(0, 3).map((team, index) => {
              const medals = ['🥇', '🥈', '🥉'];
              const bgColors = [
                'bg-yellow-500/20 border-yellow-500/50',
                'bg-gray-400/20 border-gray-400/50',
                'bg-amber-600/20 border-amber-600/50'
              ];
              const textColors = [
                'text-yellow-600',
                'text-gray-600',
                'text-amber-700'
              ];

              return (
                <div
                  key={team.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${bgColors[index]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{medals[index]}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`font-bold text-sm sm:text-lg ${textColors[index]} truncate`}>
                          {team.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {team.scannedQRCodes?.length || 0} QR codes
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg sm:text-2xl font-bold ${textColors[index]}`}>
                        {team.points}
                      </div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-2 sm:p-4 py-4 sm:py-6">
        <div className="w-full max-w-4xl bg-background border border-border rounded-lg shadow-lg">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">Admin Panel</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage codes, teams, and game settings</p>
                </div>
              </div>
              <Button variant="outline" onClick={onClose} size="sm" className="flex-shrink-0">
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6 ${
                message.includes('success') || message.includes('successfully')
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {message}
              </div>
            )}

            {/* Game Controls */}
            <Card className="mb-4 sm:mb-6 border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                  Game Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {/* Pause Button */}
                  <div className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {gamePaused ? (
                        <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                      ) : (
                        <Play className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm">Game Status</div>
                        <div className="text-xs text-muted-foreground">
                          {gamePaused ? 'Paused' : 'Running'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={gamePaused ? "default" : "outline"}
                      onClick={toggleGamePause}
                      disabled={isLoading}
                      className="flex-shrink-0 p-1 h-8 w-8"
                    >
                      {gamePaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Score Visibility */}
                  <div className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {showScores ? (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm">Scores</div>
                        <div className="text-xs text-muted-foreground">
                          {showScores ? 'Visible' : 'Hidden'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={showScores ? "default" : "outline"}
                      onClick={toggleScoreVisibility}
                      disabled={isLoading}
                      className="flex-shrink-0 p-1 h-8 w-8"
                    >
                      {showScores ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Leaderboard Toggle */}
                  <div className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm">Leaderboard</div>
                        <div className="text-xs text-muted-foreground">
                          {showLeaderboard ? 'Showing' : 'Hidden'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={showLeaderboard ? "default" : "outline"}
                      onClick={() => setShowLeaderboard(!showLeaderboard)}
                      className="flex-shrink-0 p-1 h-8 w-8"
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Reset Game */}
                <div className="pt-2 sm:pt-3 border-t">
                  {!showResetConfirm ? (
                    <Button
                      variant="destructive"
                      className="w-full text-sm"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Game
                    </Button>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm text-red-600">Are you sure?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This will delete all teams and reset the game.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={resetGame}
                          disabled={isLoading}
                          className="flex-1 text-xs sm:text-sm"
                        >
                          Confirm Reset
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowResetConfirm(false)}
                          disabled={isLoading}
                          className="flex-1 text-xs sm:text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top 3 Leaderboard */}
            {showLeaderboard && renderTopThreeLeaderboard()}

            {/* Tabs */}
            <Tabs defaultValue="qr-codes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
                <TabsTrigger value="qr-codes" className="text-xs sm:text-sm">QR Codes</TabsTrigger>
                <TabsTrigger value="invite-codes" className="text-xs sm:text-sm">Invites</TabsTrigger>
                <TabsTrigger value="teams" className="text-xs sm:text-sm">Teams</TabsTrigger>
              </TabsList>

              {/* QR Codes Tab */}
              <TabsContent value="qr-codes" className="space-y-4 sm:space-y-6">
                <QRCodeGenerator />
              </TabsContent>

              {/* Invite Codes Tab */}
              <TabsContent value="invite-codes" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Add New Invitation Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                      <Input
                        placeholder="Enter invitation code"
                        value={newInviteCode}
                        onChange={(e) => setNewInviteCode(e.target.value)}
                        className="font-mono flex-1 text-xs sm:text-sm"
                      />
                      <Button onClick={addInviteCode} disabled={isLoading} className="text-xs sm:text-sm">
                        <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">Current Invitation Codes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {inviteCodes.length} codes created
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {inviteCodes.map((invite) => {
                        const isUsed = teams.some(team => team.inviteCode === invite.code)
                        return (
                          <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
                              <code className="bg-muted px-2 py-1 rounded text-xs sm:text-sm font-mono truncate">
                                {invite.code}
                              </code>
                              <Badge variant={isUsed ? "destructive" : "secondary"} className="w-fit text-xs">
                                {isUsed ? "Used" : "Available"}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteInviteCode(invite.id)}
                              disabled={isUsed}
                              className="text-xs"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                      {inviteCodes.length === 0 && (
                        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                          No invitation codes created yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teams Tab */}
              <TabsContent value="teams" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center text-base sm:text-lg">
                          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Registered Teams
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {teams.length} teams registered
                        </CardDescription>
                      </div>
                      <Button onClick={exportTeamsData} variant="outline" size="sm" className="text-xs sm:text-sm">
                        <Download className="h-4 w-4 mr-1 sm:mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {teams.map((team, index) => (
                        <div key={team.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground text-xs sm:text-sm truncate">{team.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {team.inviteCode} • {new Date(team.registeredAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-sm sm:text-base font-bold text-primary">{team.points} pts</div>
                              <div className="text-xs text-muted-foreground">{team.scannedQRCodes?.length || 0} QR</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {teams.length === 0 && (
                        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                          No teams registered yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
