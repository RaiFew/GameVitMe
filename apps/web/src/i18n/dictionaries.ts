/**
 * Flat string tables, one per language. English is the source of truth: a key
 * that exists only in Thai falls back to English rather than rendering a blank.
 *
 * `{name}` placeholders are filled from the `vars` argument.
 */
export const en = {
  'app.title': 'Party Games',

  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',

  'nav.home': 'Home',
  'nav.games': 'Games',
  'nav.ranking': 'Ranking',
  'nav.friends': 'Friends',
  'nav.login': 'Login',
  'nav.signOut': 'Sign Out',
  'nav.toggleTheme': 'Toggle theme',
  'nav.switchToLight': 'Switch to light mode',
  'nav.switchToDark': 'Switch to dark mode',
  'nav.toggleMenu': 'Toggle navigation menu',
  'nav.toggleLanguage': 'Switch language',

  'home.title': 'PARTY//GAME',
  'home.headline': 'Everyone in the room in one code.',
  'home.subhead':
    'Real-time party games that run in the browser. No install, no lobby naming arguments — a host makes a room, everyone reads out five characters, and the game starts.',
  'home.codeCaption': 'a room code',
  'home.createRoom': 'Create a room',
  'home.joinGame': 'Join a game',
  'home.pillar1.title': 'Instant rooms',
  'home.pillar1.body':
    'Start a lobby in seconds. Players join by scanning a QR code or typing a five-character code — no account required to get started.',
  'home.pillar2.title': 'Host and screen mode',
  'home.pillar2.body':
    'Cast a TV or laptop as the room screen while players hold private roles and votes on their own phones.',
  'home.pillar3.title': 'Server-authoritative',
  'home.pillar3.body':
    'The server holds the truth. Secret roles, locations, and timers are masked per player, so nothing worth hiding ever reaches a client.',

  'login.title': 'Sign In',
  'login.subtitle': 'Enter a nickname to play as guest or sign in with Google.',
  'login.nicknameLabel': 'Player Nickname',
  'login.nicknamePlaceholder': 'e.g. Maverick',
  'login.entering': 'Entering Room...',
  'login.playAsGuest': 'Play As Guest',
  'login.orContinueWith': 'Or Continue With',
  'login.google': 'Google Account',

  'dashboard.playerHub': 'Player Hub',
  'dashboard.friends': 'Friends',
  'dashboard.joinRoom': 'Join Room',
  'dashboard.createRoom': 'Create Room',
  'dashboard.notice': 'NOTICE:',
  'dashboard.createNewRoom': 'Create New Room',
  'dashboard.createNewRoomBody':
    'Start an official room as Host (TV / Screen Mode) or join together with 4–12 players.',
  'dashboard.startRoom': 'Start Room',
  'dashboard.joinExistingRoom': 'Join Existing Room',
  'dashboard.joinExistingRoomBody':
    'Enter a 5-character room code or scan your host screen QR code.',
  'dashboard.scanQr': 'Scan QR Code',
  'dashboard.join': 'Join',
  'dashboard.codePlaceholder': 'CODE',
  'dashboard.featuredGames': 'Featured Games',
  'dashboard.viewAll': 'View All →',
  'dashboard.friendsOnline': 'Friends Online ({count})',
  'dashboard.manage': 'Manage →',
  'dashboard.noFriends': 'No friends added yet.',
  'dashboard.mobileJoinTitle': 'Join a Room',
  'dashboard.mobileJoinBody': "Enter the 5-character code from the host's screen, or scan its QR code.",
  'dashboard.scanQrTitle': 'Scan Room QR Code',
  'dashboard.errNoCode': 'Please enter a room code',
  'dashboard.errJoinTimeout': 'Room join request timed out. Please check room code.',
  'dashboard.errJoinFailed': 'Failed to join room',
  'dashboard.errConnectTimeout': 'Connecting to game server timed out.',

  'games.heading': 'Available Games',
  'games.subheading':
    'Browse multiplayer party and social deduction games optimized for mobile and desktop screens.',
  'games.gotCode': 'Got a room code?',
  'games.codePlaceholder': '5-character code',
  'games.joinRoom': 'Join room',
  'games.startRoom': 'Start a room',
  'games.comingSoon': 'Coming soon',
  'games.ready': 'Ready to play',
  'games.catSpyfall': 'Social Deduction',
  'games.catWerewolf': 'Hidden Roles',
  'games.catSalem': 'Witch Trials & Deduction',
  'games.catCodenames': 'Word Deduction & Teams',
  'games.catCodenamesShort': 'Word Teams & 2P Co-op',
  'games.catRps': 'Arcade & Battle Royale',
  'games.catRpsShort': 'Arcade Duel & BR',
  'games.catNumberGrid': 'Speedrun & Reflex',
  'games.descSpyfall':
    'Find the secret spy among the players. Everyone knows the secret location except for one player: The Spy.',
  'games.descWerewolf':
    'Villagers and special roles work together to uncover and eliminate hidden werewolves before they outnumber the village.',
  'games.descSalem':
    'Accuse, conspire, and defend against hidden witches before Salem falls into hysteria. 1 Host Moderator required.',
  'games.descCodenames':
    'Two rival teams (Red vs Blue) deduce word cards via Spymaster clues. Features 2-Player Cooperative mode and custom word file uploads.',
  'games.descRps':
    'Fast-paced hand battles! Features 1v1 Fighting Game Duel with TV Host Screen mode, Battle Royale Survival Elimination, and Points Race.',
  'games.descNumberGrid':
    'Click numbered circles in ascending order from 2x2 up to 10x10. Features sequential rounds, custom grid layouts, HP penalty, and survival damage modes.',

  'profile.accountSettings': 'Account Settings',
  'profile.heading': 'Profile',
  'profile.username': 'Username',
  'profile.email': 'Email',
  'profile.accountCreated': 'Account Created',
  'profile.guestPlayer': 'Guest Player (No Email)',
  'profile.privacy': 'Privacy & Broadcast',
  'profile.streamerMode': 'Streamer Mode',
  'profile.streamerModeBody':
    'Always hides room join codes and QR codes across the site by default to prevent stream sniping.',
  'profile.status': 'Status:',
  'profile.statusActive': 'ACTIVE (Codes & QR Hidden)',
  'profile.statusOff': 'OFF (Normal Display)',
} as const;

export type TranslationKey = keyof typeof en;

export const th: Record<TranslationKey, string> = {
  'app.title': 'เกมปาร์ตี้',

  'common.cancel': 'ยกเลิก',
  'common.save': 'บันทึก',
  'common.edit': 'แก้ไข',
  'common.loading': 'กำลังโหลด...',

  'nav.home': 'หน้าแรก',
  'nav.games': 'เกม',
  'nav.ranking': 'อันดับ',
  'nav.friends': 'เพื่อน',
  'nav.login': 'เข้าสู่ระบบ',
  'nav.signOut': 'ออกจากระบบ',
  'nav.toggleTheme': 'สลับธีม',
  'nav.switchToLight': 'สลับเป็นโหมดสว่าง',
  'nav.switchToDark': 'สลับเป็นโหมดมืด',
  'nav.toggleMenu': 'สลับเมนูนำทาง',
  'nav.toggleLanguage': 'สลับภาษา',

  'home.title': 'PARTY//GAME',
  'home.headline': 'ทุกคนอยู่ในห้องเดียว ด้วยรหัสเดียว',
  'home.subhead':
    'เกมปาร์ตี้เรียลไทม์ที่เล่นผ่านเบราว์เซอร์ ไม่ต้องติดตั้งอะไร ไม่ต้องเถียงกันเรื่องชื่อห้อง — เจ้าพนัสสร้างห้อง ทุกคนอ่านรหัสห้าตัวอักษร เกมก็เริ่ม',
  'home.codeCaption': 'คือรหัสห้อง',
  'home.createRoom': 'สร้างห้อง',
  'home.joinGame': 'เข้าร่วมเกม',
  'home.pillar1.title': 'สร้างห้องได้ทันที',
  'home.pillar1.body':
    'เปิดห้องได้ในไม่กี่วินาที ผู้เล่นเข้าร่วมด้วยการสแกนคิวอาร์โค้ดหรือพิมพ์รหัสห้าตัวอักษร — เริ่มเล่นได้โดยไม่ต้องมีบัญชี',
  'home.pillar2.title': 'โหมดเจ้าพนัสและจอภาพ',
  'home.pillar2.body':
    'ฉายทีวีหรือแล็ปท็อปเป็นจอของห้อง ขณะที่ผู้เล่นถือบทบาลและการลงคะแนนเป็นความลับบนเครื่องของตัวเอง',
  'home.pillar3.title': 'เซิร์ฟเวอร์เป็นผู้ตัดสิน',
  'home.pillar3.body':
    'เซิร์ฟเวอร์เก็บความจริงไว้ บทบาลลับ สถานที่ลับ และเวลานับถอยหลัง จะถูกปิดบังตามผู้เล่นแต่ละคน เพื่อไม่ให้สิ่งที่ควรซ่อนหลุดไปถึงเครื่องลูกค้า',

  'login.title': 'เข้าสู่ระบบ',
  'login.subtitle': 'ใส่ชื่อเล่นเพื่อเข้าเล่นแบบผู้เยี่ยม หรือเข้าสู่ระบบด้วย Google',
  'login.nicknameLabel': 'ชื่อเล่น',
  'login.nicknamePlaceholder': 'เช่น มาสเวอริค',
  'login.entering': 'กำลังเข้าห้อง...',
  'login.playAsGuest': 'เล่นแบบผู้เยี่ยม',
  'login.orContinueWith': 'หรือเข้าสู่ระบบด้วย',
  'login.google': 'บัญชี Google',

  'dashboard.playerHub': 'ศูนย์ผู้เล่น',
  'dashboard.friends': 'เพื่อน',
  'dashboard.joinRoom': 'เข้าห้อง',
  'dashboard.createRoom': 'สร้างห้อง',
  'dashboard.notice': 'แจ้ง:',
  'dashboard.createNewRoom': 'สร้างห้องใหม่',
  'dashboard.createNewRoomBody':
    'สร้างห้องอย่างเป็นทางการในฐานะเจ้าพนัส (โหมดทีวี/จอภาพ) หรือเล่นร่วมกัน 4–12 คน',
  'dashboard.startRoom': 'เริ่มห้อง',
  'dashboard.joinExistingRoom': 'เข้าห้องที่มีอยู่',
  'dashboard.joinExistingRoomBody': 'ใส่รหัสห้อง 5 ตัวอักษร หรือสแกนคิวอาร์โค้ดจากจอเจ้าพนัส',
  'dashboard.scanQr': 'สแกนคิวอาร์โค้ด',
  'dashboard.join': 'เข้า',
  'dashboard.codePlaceholder': 'รหัส',
  'dashboard.featuredGames': 'เกมแนะนำ',
  'dashboard.viewAll': 'ดูทั้งหมด →',
  'dashboard.friendsOnline': 'เพื่อนออนไลน์ ({count})',
  'dashboard.manage': 'จัดการ →',
  'dashboard.noFriends': 'ยังไม่มีเพื่อนที่เพิ่มไว้',
  'dashboard.mobileJoinTitle': 'เข้าห้อง',
  'dashboard.mobileJoinBody': 'ใส่รหัส 5 ตัวอักษรจากจอเจ้าพนัส หรือสแกนคิวอาร์โค้ดของห้อง',
  'dashboard.scanQrTitle': 'สแกนคิวอาร์โค้ดห้อง',
  'dashboard.errNoCode': 'กรุณาใส่รหัสห้อง',
  'dashboard.errJoinTimeout': 'การขอเข้าห้องหมดเวลา กรุณาตรวจสอบรหัสห้อง',
  'dashboard.errJoinFailed': 'เข้าห้องไม่สำเร็จ',
  'dashboard.errConnectTimeout': 'เชื่อมต่อเซิร์ฟเวอร์เกมหมดเวลา',

  'games.heading': 'เกมที่เล่นได้',
  'games.subheading':
    'เลือกดูเกมปาร์ตี้หลายคนและเกมเดาสัตว์ที่ปรับให้เหมาะกับทั้งมือถือและคอมพิวเตอร์',
  'games.gotCode': 'มีรหัสห้องอยู่?',
  'games.codePlaceholder': 'รหัส 5 ตัวอักษร',
  'games.joinRoom': 'เข้าห้อง',
  'games.startRoom': 'สร้างห้อง',
  'games.comingSoon': 'กำลังจะมา',
  'games.ready': 'พร้อมเล่น',
  'games.catSpyfall': 'เดาลับทางสังคม',
  'games.catWerewolf': 'บทบาลซ่อน',
  'games.catSalem': 'คดีแม่ม้ายุคนิวาณ',
  'games.catCodenames': 'เดาคำและแข่งทีม',
  'games.catCodenamesShort': 'แข่งทีมคำและโหมด 2 คน',
  'games.catRps': 'อาร์เคดและคุชเซอร์รอยัล',
  'games.catRpsShort': 'ดวลอาร์เคดและคุชเซอร์รอยัล',
  'games.catNumberGrid': 'สปีดรันและสายตาสะบาย',
  'games.descSpyfall':
    'หาสายลับที่แฝงอยู่ในกลุ่ม ทุกคนรู้สถานที่ลับ ยกเว้นคนเดียว — สายลับ',
  'games.descWerewolf':
    'ชาวบ้านและบทบาลพิเศษร่วมกันเปิดเผยและกำจัดหมู่มนุษย์หรูฆ่าที่ซ่อนตัว ก่อนที่พวกเขาจะมีมากกว่าชาวบ้าน',
  'games.descSalem':
    'กล่าวหาคดี สมคบ และป้องกันตัวจากแม่ม้าที่ซ่อนตัว ก่อนที่ซาลเลมจะจมอยู่ในภาวะฮือเฮา ต้องมีผู้ดำเนินเกม 1 คน',
  'games.descCodenames':
    'สองทีมคู่แข่ง (แดง พบ น้ำเงิน) เดาการ์ดคำจากคำใบ้ของสปายมาสเตอร์ รองรับโหมดเล่นร่วม 2 คน และอัปโหลดคำศัพท์เอง',
  'games.descRps':
    'การดวลมือเร็วจัง! มีโหมดดวล 1 กับ 1 แบบจอเจ้าพนัสทีวี โหมดคุชเซอร์รอยัลตัดสินชีวิต และการแข่งแต้ม',
  'games.descNumberGrid':
    'คลิกวงกลมตัวเลขเรียงจากน้อยไปมาก ตั้งแต่ 2x2 ถึง 10x10 มีรอบตามลำดับ เลย์เอาต์กริดกำหนดเอง ระบบเสียเลือด และโหมดเอาตัวรอด',

  'profile.accountSettings': 'ตั้งค่าบัญชี',
  'profile.heading': 'โปรไฟล์',
  'profile.username': 'ชื่อผู้ใช้',
  'profile.email': 'อีเมล',
  'profile.accountCreated': 'สร้างบัญชีเมื่อ',
  'profile.guestPlayer': 'ผู้เล่นชั่วคราว (ไม่มีอีเมล)',
  'profile.privacy': 'ความเป็นส่วนตัวและการถ่ายทอดสด',
  'profile.streamerMode': 'โหมดสตรีมเมอร์',
  'profile.streamerModeBody':
    'ซ่อนรหัสห้องและคิวอาร์โค้ดทั่วทั้งเว็บไซต์โดยค่าเริ่มต้น เพื่อไม่ให้ถูกแอบดูรหัสจากไลฟ์สตรีม',
  'profile.status': 'สถานะ:',
  'profile.statusActive': 'เปิดอยู่ (ซ่อนรหัสและคิวอาร์โค้ด)',
  'profile.statusOff': 'ปิด (แสดงตามปกติ)',
};

export type Lang = 'en' | 'th';

const TABLES: Record<Lang, Record<TranslationKey, string>> = { en, th };

export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
  // Unknown Thai strings fall back to English rather than rendering nothing.
  const text = TABLES[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match));
}
