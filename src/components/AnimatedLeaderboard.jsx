import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Zap, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase.js';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const AnimatedLeaderboard = ({ onClose }) => {
  const [topTeams, setTopTeams] = useState([]);

  useEffect(() => {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, orderBy('points', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const teamsData = [];
      querySnapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      setTopTeams(teamsData.slice(0, 3));
    });

    return () => unsubscribe();
  }, []);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, duration: 0.5 }
    }),
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const getMedalEmoji = (index) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index];
  };

  const rankColors = [
    'from-yellow-400 to-yellow-600',
    'from-gray-300 to-gray-500',
    'from-amber-500 to-amber-700',
  ];

  const rankBgColors = [
    'bg-yellow-500/20 border-yellow-400/50',
    'bg-gray-400/20 border-gray-300/50',
    'bg-amber-600/20 border-amber-500/50',
  ];

  const textColors = [
    'text-yellow-300',
    'text-gray-200',
    'text-amber-200',
  ];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md text-white p-2 sm:p-4 z-50 flex flex-col items-center justify-center overflow-y-auto">
      {/* Close Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10 flex-shrink-0"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 sm:mb-8 lg:mb-10 mt-12 sm:mt-0 px-2"
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
          <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 animate-pulse" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold drop-shadow-lg">
            Top 3 Teams
          </h1>
          <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 animate-pulse" />
        </div>
        <p className="text-xs sm:text-sm md:text-base text-white/70">
          🏆 Champions of the Challenge 🏆
        </p>
      </motion.div>

      {/* Leaderboard */}
      <div className="w-full max-w-2xl px-2 sm:px-4 space-y-3 sm:space-y-4">
        <AnimatePresence>
          {topTeams.length === 0 ? (
            <motion.div
              key="no-teams"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={itemVariants}
              className="text-center py-8 sm:py-12"
            >
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base md:text-lg text-white/70">
                No teams registered yet
              </p>
            </motion.div>
          ) : (
            topTeams.map((team, index) => (
              <motion.div
                key={team.id}
                custom={index}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={itemVariants}
                layout
                className={`relative overflow-hidden rounded-lg sm:rounded-xl border-2 ${rankBgColors[index]}`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${rankColors[index]} opacity-10`} />

                {/* Content */}
                <div className="relative p-3 sm:p-4 md:p-6 lg:p-8">
                  <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
                    {/* Left Section - Medal and Team Info */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                      {/* Medal */}
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl flex-shrink-0"
                      >
                        {getMedalEmoji(index)}
                      </motion.div>

                      {/* Team Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          {index === 0 && (
                            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 flex-shrink-0" />
                          )}
                          <h2 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate ${textColors[index]}`}>
                            {team.name}
                          </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-white/60">
                          {team.scannedQRCodes?.length || 0} QR codes scanned
                        </p>
                      </div>
                    </div>

                    {/* Right Section - Points */}
                    <div className="text-right flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.2 + 0.3, duration: 0.4 }}
                        className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black ${textColors[index]}`}
                      >
                        {team.points}
                      </motion.div>
                      <p className="text-xs sm:text-sm font-semibold text-white/70">POINTS</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.2 + 0.5, duration: 0.6 }}
                    className="mt-2 sm:mt-3 md:mt-4 h-1.5 sm:h-2 md:h-3 bg-white/10 rounded-full overflow-hidden origin-left"
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${rankColors[index]}`}
                      style={{
                        width: `${Math.min((team.points / (topTeams[0]?.points || 1)) * 100, 100)}%`
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-6 sm:mt-8 lg:mt-10 text-center text-xs sm:text-sm text-white/60 px-2"
      >
        <p>Total Teams: <span className="font-bold text-white">{topTeams.length}</span></p>
      </motion.div>
    </div>
  );
};

export default AnimatedLeaderboard;
