// Scripture chapter detection service
// Week 2: Regex patterns for Bible passage detection

// Bible book mapping with aliases
const BIBLE_BOOKS: Record<string, string> = {
  // Old Testament
  'genesis': 'Genesis', 'gen': 'Genesis',
  'exodus': 'Exodus', 'exo': 'Exodus',
  'leviticus': 'Leviticus', 'lev': 'Leviticus',
  'numbers': 'Numbers', 'num': 'Numbers',
  'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy',
  'joshua': 'Joshua', 'josh': 'Joshua',
  'judges': 'Judges', 'judg': 'Judges',
  'ruth': 'Ruth',
  '1 samuel': '1 Samuel', '1 sam': '1 Samuel', '1samuel': '1 Samuel',
  '2 samuel': '2 Samuel', '2 sam': '2 Samuel', '2samuel': '2 Samuel',
  '1 kings': '1 Kings', '1 kgs': '1 Kings', '1kings': '1 Kings',
  '2 kings': '2 Kings', '2 kgs': '2 Kings', '2kings': '2 Kings',
  '1 chronicles': '1 Chronicles', '1 chr': '1 Chronicles', '1chronicles': '1 Chronicles',
  '2 chronicles': '2 Chronicles', '2 chr': '2 Chronicles', '2chronicles': '2 Chronicles',
  'ezra': 'Ezra',
  'nehemiah': 'Nehemiah', 'neh': 'Nehemiah',
  'esther': 'Esther', 'esth': 'Esther',
  'job': 'Job',
  'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms',
  'proverbs': 'Proverbs', 'prov': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes',
  'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon', 'sos': 'Song of Solomon',
  'isaiah': 'Isaiah', 'isa': 'Isaiah',
  'jeremiah': 'Jeremiah', 'jer': 'Jeremiah',
  'lamentations': 'Lamentations', 'lam': 'Lamentations',
  'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel',
  'daniel': 'Daniel', 'dan': 'Daniel',
  'hosea': 'Hosea', 'hos': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obadiah': 'Obadiah', 'obad': 'Obadiah',
  'jonah': 'Jonah',
  'micah': 'Micah', 'mic': 'Micah',
  'nahum': 'Nahum', 'nah': 'Nahum',
  'habakkuk': 'Habakkuk', 'hab': 'Habakkuk',
  'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah',
  'haggai': 'Haggai', 'hag': 'Haggai',
  'zechariah': 'Zechariah', 'zech': 'Zechariah',
  'malachi': 'Malachi', 'mal': 'Malachi',
  
  // New Testament
  'matthew': 'Matthew', 'matt': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'romans': 'Romans', 'rom': 'Romans',
  '1 corinthians': '1 Corinthians', '1 cor': '1 Corinthians', '1corinthians': '1 Corinthians',
  '2 corinthians': '2 Corinthians', '2 cor': '2 Corinthians', '2corinthians': '2 Corinthians',
  'galatians': 'Galatians', 'gal': 'Galatians',
  'ephesians': 'Ephesians', 'eph': 'Ephesians',
  'philippians': 'Philippians', 'phil': 'Philippians',
  'colossians': 'Colossians', 'col': 'Colossians',
  '1 thessalonians': '1 Thessalonians', '1 thess': '1 Thessalonians', '1thessalonians': '1 Thessalonians',
  '2 thessalonians': '2 Thessalonians', '2 thess': '2 Thessalonians', '2thessalonians': '2 Thessalonians',
  '1 timothy': '1 Timothy', '1 tim': '1 Timothy', '1timothy': '1 Timothy',
  '2 timothy': '2 Timothy', '2 tim': '2 Timothy', '2timothy': '2 Timothy',
  'titus': 'Titus',
  'philemon': 'Philemon', 'phlm': 'Philemon',
  'hebrews': 'Hebrews', 'heb': 'Hebrews',
  'james': 'James', 'jas': 'James',
  '1 peter': '1 Peter', '1 pet': '1 Peter', '1peter': '1 Peter',
  '2 peter': '2 Peter', '2 pet': '2 Peter', '2peter': '2 Peter',
  '1 john': '1 John', '1john': '1 John',
  '2 john': '2 John', '2john': '2 John',
  '3 john': '3 John', '3john': '3 John',
  'jude': 'Jude',
  'revelation': 'Revelation', 'rev': 'Revelation'
}

// Scripture reference regex pattern
const SCRIPTURE_REGEX = /([1-3]?\s?[A-Za-z]+)\s(\d{1,3}):(\d{1,3})(?:–|-)?(\d{1,3})?/gi

export interface ScriptureReference {
  book: string
  chapter: number
  verse: number
  endVerse?: number
  fullReference: string
  start_s: number
}

export function detectScriptureReferences(transcript: string, startTime: number = 0): ScriptureReference[] {
  const references: ScriptureReference[] = []
  const matches = transcript.matchAll(SCRIPTURE_REGEX)
  
  for (const match of Array.from(matches)) {
    const [, bookText, chapterStr, verseStr, endVerseStr] = match
    
    // Normalize book name
    const normalizedBook = bookText.toLowerCase().trim()
    const canonicalBook = BIBLE_BOOKS[normalizedBook]
    
    if (canonicalBook) {
      const chapter = parseInt(chapterStr)
      const verse = parseInt(verseStr)
      const endVerse = endVerseStr ? parseInt(endVerseStr) : undefined
      
      // Create full reference string
      let fullReference = `${canonicalBook} ${chapter}:${verse}`
      if (endVerse && endVerse !== verse) {
        fullReference += `-${endVerse}`
      }
      
      references.push({
        book: canonicalBook,
        chapter,
        verse,
        endVerse,
        fullReference,
        start_s: startTime
      })
    }
  }
  
  return references
}

export function detectTopics(transcript: string): string[] {
  const topics: string[] = []
  const lowerTranscript = transcript.toLowerCase()
  
  // Topic keywords
  const topicKeywords: Record<string, string[]> = {
    'hope': ['hope', 'hopeful', 'hopeless'],
    'grace': ['grace', 'gracious', 'graceful'],
    'faith': ['faith', 'faithful', 'faithfulness', 'believe', 'belief'],
    'love': ['love', 'loving', 'charity', 'agape'],
    'forgiveness': ['forgive', 'forgiveness', 'forgiven', 'pardon'],
    'salvation': ['salvation', 'saved', 'save', 'redeem', 'redemption'],
    'prayer': ['pray', 'prayer', 'praying', 'intercession'],
    'worship': ['worship', 'praise', 'glorify', 'adore'],
    'sin': ['sin', 'sinful', 'sinner', 'transgression'],
    'repentance': ['repent', 'repentance', 'turn away', 'confess'],
    'discipleship': ['disciple', 'follow', 'followers', 'discipleship'],
    'evangelism': ['evangelize', 'gospel', 'witness', 'share'],
    'family': ['family', 'marriage', 'husband', 'wife', 'children'],
    'suffering': ['suffer', 'suffering', 'pain', 'trial', 'tribulation'],
    'perseverance': ['persevere', 'endure', 'persistence', 'steadfast'],
    'wisdom': ['wise', 'wisdom', 'understanding', 'knowledge'],
    'humility': ['humble', 'humility', 'meek', 'lowly'],
    'generosity': ['give', 'generous', 'charity', 'tithe', 'offering']
  }
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lowerTranscript.includes(keyword)) {
        topics.push(topic)
        break
      }
    }
  }
  
  return Array.from(new Set(topics)) // Remove duplicates
}

export function generateChapters(transcript: string, startTime: number = 0) {
  const scriptureRefs = detectScriptureReferences(transcript, startTime)
  const topics = detectTopics(transcript)
  
  const chapters = [
    ...scriptureRefs.map(ref => ({
      start_s: ref.start_s,
      end_s: ref.start_s + 30, // Assume 30 seconds per reference
      title: ref.fullReference,
      type: 'passage' as const,
      value: ref.fullReference
    })),
    ...topics.map(topic => ({
      start_s: startTime,
      end_s: startTime + 60,
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      type: 'topic' as const,
      value: topic
    }))
  ]
  
  return chapters.sort((a, b) => a.start_s - b.start_s)
}
