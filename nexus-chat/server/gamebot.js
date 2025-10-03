// Gamebot system for NexusChat
const { v4: uuidv4 } = require('uuid');

class GameBot {
  constructor() {
    this.isActive = false;
    this.currentGame = null;
    this.allTimeScores = new Map(); // userId -> { score, username }
    this.gameHistory = [];
    
    // Initialize with some sample data for testing
    this.initializeSampleData();
    
    // Real English dictionary - 3+ letters only
    this.dictionary = new Set([
      // 3-letter words (real English words only)
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'HAS', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'WAY', 'WIN', 'YES', 'YET', 'BAD', 'BAG', 'BAT', 'BED', 'BIG', 'BOX', 'BUS', 'CAR', 'CAT', 'CUP', 'CUT', 'DOG', 'EAR', 'EAT', 'EGG', 'END', 'EYE', 'FAR', 'FUN', 'GET', 'GOT', 'GUN', 'HAT', 'HIT', 'HOT', 'JOB', 'LEG', 'LOT', 'MAP', 'MOM', 'PEN', 'PET', 'PIG', 'POT', 'RED', 'RUN', 'SIT', 'SUN', 'TOP', 'TOY', 'VAN', 'WAR', 'WET', 'ZOO', 'ACE', 'ACT', 'ADD', 'AGE', 'AID', 'AIM', 'AIR', 'ART', 'ASK', 'BAN', 'BAR', 'BAY', 'BET', 'BIT', 'BOW', 'BUY', 'COW', 'CRY', 'DAD', 'DAY', 'DEN', 'DIG', 'DIM', 'DRY', 'DUE', 'ELF', 'ELM', 'ERA', 'EVE', 'FAN', 'FAT', 'FEW', 'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOG', 'FOX', 'FRY', 'FUR', 'GAP', 'GAS', 'GEM', 'GOD', 'GUM', 'GUY', 'GYM', 'HAM', 'HEN', 'HID', 'HIM', 'HIP', 'HOP', 'HUB', 'HUG', 'HUM', 'HUT', 'ICE', 'ILL', 'INK', 'ION', 'IVY', 'JAM', 'JAR', 'JAW', 'JET', 'JIG', 'JOG', 'JOY', 'JUG', 'KEY', 'KID', 'KIT', 'LAB', 'LAD', 'LAP', 'LAW', 'LAY', 'LED', 'LID', 'LIE', 'LIP', 'LOG', 'LOW', 'MAD', 'MAT', 'MAY', 'MEN', 'MET', 'MID', 'MIX', 'MOB', 'MOD', 'MUD', 'MUG', 'NAP', 'NET', 'NOD', 'NOR', 'NUT', 'OAK', 'ODD', 'OIL', 'ORB', 'ORE', 'OWE', 'OWL', 'OWN', 'PAD', 'PAN', 'PAT', 'PAW', 'PAY', 'PEA', 'PIE', 'PIN', 'PIT', 'PLY', 'POD', 'POP', 'PRO', 'PUB', 'PUP', 'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RIB', 'RID', 'RIM', 'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'SAD', 'SAG', 'SAP', 'SAT', 'SAW', 'SEA', 'SET', 'SEW', 'SHY', 'SIN', 'SIP', 'SIR', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOW', 'SOY', 'SPA', 'SPY', 'SUB', 'SUM', 'TAB', 'TAG', 'TAN', 'TAP', 'TAR', 'TAX', 'TEA', 'TEN', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOW', 'TRY', 'TUB', 'TUG', 'TWO', 'URN', 'VAT', 'VET', 'VIA', 'VIE', 'VOW', 'WAD', 'WAG', 'WAN', 'WAX', 'WEB', 'WED', 'WHY', 'WIG', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW', 'YAM', 'YAP', 'YAW', 'YEA', 'YEN', 'YEP', 'YEW', 'YIN', 'YIP', 'YOW', 'ZAP', 'ZEN', 'ZIP', 'ZIT',
      // 4-letter words
      'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN', 'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST', 'LIKE', 'LONG', 'MAKE', 'MANY', 'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'WHAT', 'WORD', 'WORK', 'YEAR', 'BACK', 'CALL', 'CAME', 'EACH', 'FIND', 'GIVE', 'HAND', 'HIGH', 'KEEP', 'LAST', 'LEFT', 'LIFE', 'LIVE', 'LOOK', 'MADE', 'MOST', 'MOVE', 'MUST', 'NAME', 'NEED', 'NEXT', 'OPEN', 'PART', 'PLAY', 'RIGHT', 'SAID', 'SAME', 'SEEM', 'SHOW', 'SIDE', 'TELL', 'TURN', 'USED', 'WANT', 'WAYS', 'WEEK', 'WENT', 'WORK', 'YEAR', 'ABLE', 'AREA', 'AWAY', 'BEST', 'BOTH', 'CITY', 'COME', 'DOOR', 'DOWN', 'EACH', 'EVEN', 'EVER', 'FACE', 'FACT', 'FEEL', 'FEET', 'FIRE', 'FORM', 'FREE', 'FULL', 'GAME', 'GIRL', 'GOES', 'HELP', 'HOME', 'HOPE', 'HOUR', 'IDEA', 'INTO', 'ITEM', 'KEEP', 'KIND', 'LAND', 'LATE', 'LEAD', 'LESS', 'LINE', 'LIST', 'LIVE', 'LOVE', 'MAIN', 'MEAN', 'MIND', 'MISS', 'NEAR', 'ONCE', 'ONLY', 'PLAN', 'REAL', 'REST', 'ROOM', 'SAVE', 'SEND', 'SHIP', 'SIZE', 'SORT', 'STAY', 'STEP', 'STOP', 'SURE', 'TALK', 'TEAM', 'TEST', 'TEXT', 'TREE', 'TRUE', 'TYPE', 'UNIT', 'VIEW', 'WALK', 'WALL', 'WEAR', 'WIFE', 'WIND', 'WISH', 'WORD', 'YARD',
      // 5+ letter words
      'ABOUT', 'AFTER', 'AGAIN', 'AGAINST', 'ALONG', 'AMONG', 'AROUND', 'BASED', 'BEGAN', 'BEING', 'BELOW', 'BETWEEN', 'BLACK', 'BRING', 'BUILD', 'CARRY', 'CATCH', 'CAUSE', 'CHECK', 'CHILD', 'CLEAR', 'CLOSE', 'COULD', 'COUNT', 'COURT', 'COVER', 'CROSS', 'DEATH', 'DOING', 'DRIVE', 'EARLY', 'EARTH', 'EVERY', 'FIELD', 'FINAL', 'FIRST', 'FORCE', 'FOUND', 'FRONT', 'GIVEN', 'GOING', 'GREAT', 'GREEN', 'GROUP', 'GROWN', 'HAPPY', 'HEARD', 'HEART', 'HOUSE', 'HUMAN', 'LARGE', 'LATER', 'LEARN', 'LEAST', 'LEAVE', 'LEVEL', 'LIGHT', 'LIVED', 'LOCAL', 'MAJOR', 'MIGHT', 'MONEY', 'MONTH', 'MUSIC', 'NEVER', 'NIGHT', 'NORTH', 'OFTEN', 'ORDER', 'OTHER', 'PARTY', 'PEACE', 'PHONE', 'PLACE', 'PLANT', 'POINT', 'POWER', 'PRESS', 'PRICE', 'QUICK', 'QUITE', 'RADIO', 'REACH', 'READY', 'RIGHT', 'ROUND', 'SENSE', 'SHALL', 'SHORT', 'SHOWN', 'SINCE', 'SMALL', 'SOUND', 'SOUTH', 'SPACE', 'SPEAK', 'SPENT', 'START', 'STATE', 'STILL', 'STORY', 'STUDY', 'THEIR', 'THERE', 'THESE', 'THING', 'THINK', 'THREE', 'TODAY', 'TOTAL', 'TRADE', 'TRIED', 'UNDER', 'UNTIL', 'USING', 'VALUE', 'VIDEO', 'VOICE', 'WATER', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WORLD', 'WOULD', 'WRITE', 'WRONG', 'YOUNG', 'APPLE', 'BREAD', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HORSE', 'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MOUSE', 'NURSE', 'OCEAN', 'PAPER', 'QUEEN', 'RIVER', 'SNAKE', 'TABLE', 'UNCLE', 'VOICE', 'WHALE', 'YOUTH'
    ]);
    
    // Letter sets with guaranteed vowels for better word formation
    this.letterSets = [
      'AEIOULMNSTR', // 11 letters with vowels
      'AEIOURSTLMN', // 11 letters with vowels
      'AEIOUPQRSTL', // 11 letters with vowels
      'AEIOUHLMNST', // 11 letters with vowels
      'AEIOUCDFGHL', // 11 letters with vowels
      'AEIOURSTMNP'  // 11 letters with vowels
    ];
  }

  // Initialize sample leaderboard data
  initializeSampleData() {
    // Add some sample historical scores for testing
    this.allTimeScores.set('demo-user-1', { score: 45, username: 'Demo' });
    this.allTimeScores.set('demo-user-2', { score: 38, username: 'Vyborg' });
    this.allTimeScores.set('demo-user-3', { score: 32, username: 'TestPlayer' });
    this.allTimeScores.set('demo-user-4', { score: 28, username: 'WordMaster' });
    this.allTimeScores.set('demo-user-5', { score: 22, username: 'GameFan' });
  }

  // Generate random letters for the game
  generateLetters() {
    const randomSet = this.letterSets[Math.floor(Math.random() * this.letterSets.length)];
    const shuffled = randomSet.split('').sort(() => Math.random() - 0.5);
    return shuffled.join(''); // Return all 11 letters
  }

  // Find all valid words that can be formed from the given letters
  findAllValidWords(gameLetters) {
    const validWords = [];
    const letterCount = {};
    
    // Count available letters
    for (const letter of gameLetters) {
      letterCount[letter] = (letterCount[letter] || 0) + 1;
    }
    
    // Check each word in dictionary
    for (const word of this.dictionary) {
      if (word.length >= 3 && this.canFormWord(word, letterCount)) {
        validWords.push(word);
      }
    }
    
    return validWords.sort((a, b) => b.length - a.length || a.localeCompare(b));
  }

  // Validate if a word exists in dictionary and can be formed from letters
  isValidWord(word, gameLetters) {
    const upperWord = word.toUpperCase();
    
    // Minimum 3 letters required
    if (upperWord.length < 3) {
      return { valid: false, reason: 'Word must be at least 3 letters long' };
    }
    
    // Check if word exists in dictionary
    if (!this.dictionary.has(upperWord)) {
      return { valid: false, reason: 'Word not found in dictionary' };
    }
    
    // Check if word can be formed from available letters
    const letterCount = {};
    for (const letter of gameLetters) {
      letterCount[letter] = (letterCount[letter] || 0) + 1;
    }
    
    if (!this.canFormWord(upperWord, letterCount)) {
      return { valid: false, reason: 'Cannot form word from available letters' };
    }
    
    return { valid: true };
  }

  // Check if a word can be formed from available letters
  canFormWord(word, availableLetters) {
    const wordLetters = {};
    
    for (const letter of word.toUpperCase()) {
      wordLetters[letter] = (wordLetters[letter] || 0) + 1;
    }
    
    for (const [letter, count] of Object.entries(wordLetters)) {
      if (!availableLetters[letter] || availableLetters[letter] < count) {
        return false;
      }
    }
    
    return true;
  }

  // Start a new game session
  startGame(duration = 120000) { // 2 minutes default
    if (this.isActive) {
      return { success: false, message: 'Game already in progress' };
    }

    const letters = this.generateLetters();
    
    this.currentGame = {
      id: uuidv4(),
      letters,
      startTime: Date.now(),
      duration,
      participants: new Map(), // userId -> { username, score, words }
      submissions: [],
      validWords: this.findAllValidWords(letters), // Pre-calculate all valid words
      isActive: true
    };
    
    this.isActive = true;
    
    return {
      success: true,
      gameId: this.currentGame.id,
      letters,
      duration,
      message: `🎮 **WORD GAME STARTED!** 🎮\n\nForm words using these letters: **${letters}**\nTime limit: ${duration/1000} seconds\nType your words in chat to submit!`
    };
  }

  // Submit a word for scoring
  submitWord(userId, username, word) {
    if (!this.isActive || !this.currentGame) {
      return { success: false, message: 'No active game' };
    }

    const timeLeft = this.currentGame.duration - (Date.now() - this.currentGame.startTime);
    if (timeLeft <= 0) {
      return { success: false, message: 'Game has ended' };
    }

    const upperWord = word.toUpperCase();
    
    // Check if word is valid using dictionary
    const validation = this.isValidWord(upperWord, this.currentGame.letters);
    if (!validation.valid) {
      return { 
        success: false, 
        message: `❌ "${word}" - ${validation.reason}`,
        isGameSubmission: true
      };
    }

    // Initialize participant if new
    if (!this.currentGame.participants.has(userId)) {
      this.currentGame.participants.set(userId, {
        username,
        score: 0,
        words: []
      });
    }

    const participant = this.currentGame.participants.get(userId);
    
    // Check if word already submitted by this user
    if (participant.words.includes(upperWord)) {
      return { 
        success: false, 
        message: `❌ You already submitted "${word}"`,
        isGameSubmission: true
      };
    }

    // Prevent duplicates across different users in the same game
    const existing = this.currentGame.submissions.find(s => s.word === upperWord);
    if (existing) {
      return {
        success: false,
        message: `❌ "${word}" has already been picked by ${existing.username}`,
        isGameSubmission: true
      };
    }

    // Calculate points (longer words = more points)
    const points = this.calculatePoints(upperWord);
    participant.score += points;
    participant.words.push(upperWord);

    this.currentGame.submissions.push({
      userId,
      username,
      word: upperWord,
      points,
      timestamp: Date.now()
    });

    return {
      success: true,
      points,
      totalScore: participant.score,
      message: `✅ "${word}" (+${points} points) | Total: ${participant.score}`,
      isGameSubmission: true
    };
  }

  // Calculate points for a word
  calculatePoints(word) {
    const basePoints = word.length;
    const bonusPoints = word.length >= 6 ? 2 : word.length >= 4 ? 1 : 0;
    return basePoints + bonusPoints;
  }

  // End current game and return results
  endGame() {
    if (!this.isActive || !this.currentGame) {
      return { success: false, message: 'No active game to end' };
    }

    const participants = Array.from(this.currentGame.participants.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.score - a.score);

    // Update all-time scores with username tracking
    participants.forEach(participant => {
      if (!this.allTimeScores.has(participant.userId)) {
        this.allTimeScores.set(participant.userId, { score: 0, username: participant.username });
      }
      const existingEntry = this.allTimeScores.get(participant.userId);
      this.allTimeScores.set(participant.userId, { 
        score: existingEntry.score + participant.score, 
        username: participant.username 
      });
    });

    // Store game history
    this.gameHistory.push({
      gameId: this.currentGame.id,
      letters: this.currentGame.letters,
      participants: participants,
      startTime: this.currentGame.startTime,
      endTime: Date.now(),
      totalSubmissions: this.currentGame.submissions.length
    });

    const gameResults = {
      gameId: this.currentGame.id,
      letters: this.currentGame.letters,
      leaderboard: participants,
      totalWords: this.currentGame.submissions.length,
      validWords: this.currentGame.validWords
    };

    // Reset game state
    this.currentGame = null;
    this.isActive = false;

    return { success: true, results: gameResults };
  }

  // Get current game status
  getGameStatus() {
    if (!this.isActive || !this.currentGame) {
      return { active: false };
    }

    const timeLeft = Math.max(0, this.currentGame.duration - (Date.now() - this.currentGame.startTime));
    const participants = Array.from(this.currentGame.participants.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.score - a.score);

    return {
      active: true,
      gameId: this.currentGame.id,
      letters: this.currentGame.letters,
      timeLeft,
      participants,
      totalSubmissions: this.currentGame.submissions.length
    };
  }

  // Get all-time leaderboard
  getAllTimeLeaderboard() {
    const consolidatedScores = new Map();
    
    // Consolidate scores by username to avoid duplicates
    for (const [userId, data] of this.allTimeScores.entries()) {
      const score = typeof data === 'object' ? data.score : data;
      const username = typeof data === 'object' ? data.username : 'Unknown User';
      
      if (consolidatedScores.has(username)) {
        const existing = consolidatedScores.get(username);
        consolidatedScores.set(username, {
          userId: existing.userId,
          username,
          score: existing.score + score
        });
      } else {
        consolidatedScores.set(username, {
          userId,
          username,
          score
        });
      }
    }
    
    return Array.from(consolidatedScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
  }

  // Check if user is superadmin (for game control only, not participation)
  isSuperAdmin(user) {
    return user && user.role === 'superadmin';
  }

  // Check if user can participate in games (everyone can play, including admins)
  canParticipate(user) {
    return user && user.username; // Any logged-in user can participate
  }

  // Auto-end game when time runs out
  checkGameTimeout() {
    if (this.isActive && this.currentGame) {
      const timeLeft = this.currentGame.duration - (Date.now() - this.currentGame.startTime);
      if (timeLeft <= 0) {
        return this.endGame();
      }
    }
    return null;
  }
}

module.exports = GameBot;
