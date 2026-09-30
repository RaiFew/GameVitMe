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
  'nav.ranking': 'ตารางอันดับ',
  'nav.friends': 'เพื่อน',
  'nav.login': 'เข้าสู่ระบบ',
  'nav.signOut': 'ออกจากระบบ',
  'nav.toggleTheme': 'สลับธีม',
  'nav.switchToLight': 'เปลี่ยนเป็นโหมดสว่าง',
  'nav.switchToDark': 'เปลี่ยนเป็นโหมดมืด',
  'nav.toggleMenu': 'เปิด/ปิดเมนูนำทาง',
  'nav.toggleLanguage': 'เปลี่ยนภาษา',

  'home.title': 'PARTY//GAME',
  'home.headline': 'รวมทุกคนเข้าห้องด้วยรหัสเดียว',
  'home.subhead': 'เกมปาร์ตี้เรียลไทม์บนเบราว์เซอร์ เล่นได้ทันทีโดยไม่ต้องติดตั้ง ไม่ต้องเถียงกันเรื่องตั้งชื่อห้อง — โฮสต์สร้างห้อง ทุกคนกรอกรหัส 5 ตัวอักษร แล้วเริ่มสนุกกันได้เลย',
  'home.codeCaption': 'รหัสห้อง',
  'home.createRoom': 'สร้างห้อง',
  'home.joinGame': 'เข้าร่วมเกม',
  'home.pillar1.title': 'สร้างห้องได้ทันที',
  'home.pillar1.body': 'สร้างห้องล็อกบี้ได้ในไม่กี่วินาที ผู้เล่นเข้าร่วมได้ง่ายๆ เพียงสแกน QR Code หรือกรอกรหัส 5 ตัวอักษร — เริ่มเล่นได้ทันทีโดยไม่ต้องสมัครบัญชี',
  'home.pillar2.title': 'โหมดโฮสต์และจอหลัก',
  'home.pillar2.body': 'ใช้ทีวีหรือแล็ปท็อปเป็นหน้าจอหลักของห้อง ขณะที่ผู้เล่นแต่ละคนดูบทบาทลับและลงคะแนนผ่านมือถือตัวเอง',
  'home.pillar3.title': 'ประมวลผลผ่านเซิร์ฟเวอร์',
  'home.pillar3.body': 'เซิร์ฟเวอร์เก็บข้อมูลทั้งหมดอย่างปลอดภัย ทั้งบทบาทลับ สถานที่ และเวลานับถอยหลัง จะถูกปิดบังแยกตามผู้เล่น เพื่อป้องกันไม่ให้ข้อมูลลับหลุดไปยังเครื่องอื่น',

  'login.title': 'เข้าสู่ระบบ',
  'login.subtitle': 'ใส่ชื่อเล่นเพื่อเล่นแบบชั่วคราว หรือเข้าสู่ระบบด้วย Google',
  'login.nicknameLabel': 'ชื่อเล่น',
  'login.nicknamePlaceholder': 'เช่น Maverick',
  'login.entering': 'กำลังเข้าสู่ห้อง...',
  'login.playAsGuest': 'เล่นแบบชั่วคราว',
  'login.orContinueWith': 'หรือเข้าใช้งานด้วย',
  'login.google': 'บัญชี Google',

  'dashboard.playerHub': 'ศูนย์รวมผู้เล่น',
  'dashboard.friends': 'เพื่อน',
  'dashboard.joinRoom': 'เข้าร่วมห้อง',
  'dashboard.createRoom': 'สร้างห้อง',
  'dashboard.notice': 'ประกาศ:',
  'dashboard.createNewRoom': 'สร้างห้องใหม่',
  'dashboard.createNewRoomBody': 'สร้างห้องในฐานะโฮสต์ (โหมดทีวี / จอหลัก) หรือเข้าร่วมเล่นพร้อมกันได้ 4–12 คน',
  'dashboard.startRoom': 'เริ่มเปิดห้อง',
  'dashboard.joinExistingRoom': 'เข้าร่วมห้องที่มีอยู่',
  'dashboard.joinExistingRoomBody': 'กรอกรหัสห้อง 5 ตัวอักษร หรือสแกน QR Code จากหน้าจอโฮสต์',
  'dashboard.scanQr': 'สแกน QR Code',
  'dashboard.join': 'เข้าร่วม',
  'dashboard.codePlaceholder': 'รหัส',
  'dashboard.featuredGames': 'เกมแนะนำ',
  'dashboard.viewAll': 'ดูทั้งหมด →',
  'dashboard.friendsOnline': 'เพื่อนที่ออนไลน์ ({count})',
  'dashboard.manage': 'จัดการ →',
  'dashboard.noFriends': 'ยังไม่มีเพื่อน',
  'dashboard.mobileJoinTitle': 'เข้าร่วมห้อง',
  'dashboard.mobileJoinBody': 'กรอกรหัส 5 ตัวอักษรจากหน้าจอโฮสต์ หรือสแกน QR Code ของห้อง',
  'dashboard.scanQrTitle': 'สแกน QR Code ห้อง',
  'dashboard.errNoCode': 'กรุณากรอกรหัสห้อง',
  'dashboard.errJoinTimeout': 'หมดเวลาคำขอเข้าร่วมห้อง กรุณาตรวจสอบรหัสห้องอีกครั้ง',
  'dashboard.errJoinFailed': 'เข้าร่วมห้องไม่สำเร็จ',
  'dashboard.errConnectTimeout': 'การเชื่อมต่อกับเซิร์ฟเวอร์เกมหมดเวลา',

  'games.heading': 'เกมที่เปิดให้เล่น',
  'games.subheading': 'เลือกดูเกมปาร์ตี้และเกมสืบหาตัวจริง ที่ปรับมาให้เล่นได้อย่างลื่นไหลทั้งบนมือถือและคอมพิวเตอร์',
  'games.gotCode': 'มีรหัสห้องแล้วใช่ไหม?',
  'games.codePlaceholder': 'รหัส 5 ตัวอักษร',
  'games.joinRoom': 'เข้าร่วมห้อง',
  'games.startRoom': 'สร้างห้อง',
  'games.comingSoon': 'เร็วๆ นี้',
  'games.ready': 'พร้อมเล่น',
  'games.catSpyfall': 'สืบหาตัวจริง (Social Deduction)',
  'games.catWerewolf': 'บทบาทลับ',
  'games.catSalem': 'คดีไต่สวนแม่มดและการสืบหาความจริง',
  'games.catCodenames': 'ถอดรหัสคำแบบทีม',
  'games.catCodenamesShort': 'ถอดรหัสคำแบบทีม & โหมดเล่นคู่',
  'games.catRps': 'อาร์เคด & แบทเทิลรอยัล',
  'games.catRpsShort': 'อาร์เคดดวล & แบทเทิลรอยัล',
  'games.catNumberGrid': 'สปีดรัน & วัดความไว',
  'games.descSpyfall': 'ค้นหาสายลับที่แฝงตัวอยู่ ทุกคนจะรู้สถานที่ลับ ยกเว้นคนเดียว นั่นคือ... สายลับ',
  'games.descWerewolf': 'ชาวบ้านและบทบาทพิเศษต้องร่วมมือกันหาตัวและกำจัดมนุษย์หมาป่า ก่อนที่พวกมันจะมีจำนวนมากกว่าชาวบ้าน',
  'games.descSalem': 'กล่าวหา สมคบคิด และปกป้องตัวเองจากแม่มดที่แฝงตัวอยู่ ก่อนที่เมืองซาเล็มจะอลหม่าน (ต้องมีผู้ดำเนินเกม 1 คน)',
  'games.descCodenames': 'สองทีมคู่แข่ง (แดง พบ น้ำเงิน) ช่วยกันทายการ์ดคำจากคำใบ้ของสปายมาสเตอร์ รองรับโหมดเล่นร่วมกัน 2 คน และอัปโหลดคลังคำศัพท์เองได้',
  'games.descRps': 'เกมดวลมือสุดมันวัดความไว! รองรับการดวล 1v1 ในโหมดจอหลักทีวี โหมดแบทเทิลรอยัลเอาชีวิตรอด และโหมดแข่งทำคะแนน',
  'games.descNumberGrid': 'กดวงกลมตัวเลขเรียงจากน้อยไปมาก ตั้งแต่ตาราง 2x2 ไปจนถึง 10x10 มีทั้งระบบเล่นต่อเนื่องตามด่าน กำหนดตารางได้เอง ระบบเสียเลือด และโหมดเอาชีวิตรอด',

  'profile.accountSettings': 'ตั้งค่าบัญชี',
  'profile.heading': 'โปรไฟล์',
  'profile.username': 'ชื่อผู้ใช้',
  'profile.email': 'อีเมล',
  'profile.accountCreated': 'สร้างบัญชีเมื่อ',
  'profile.guestPlayer': 'ผู้เล่นชั่วคราว (ไม่มีอีเมล)',
  'profile.privacy': 'ความเป็นส่วนตัวและการสตรีม',
  'profile.streamerMode': 'โหมดสตรีมเมอร์',
  'profile.streamerModeBody': 'ซ่อนรหัสห้องและ QR Code ทั่วทั้งเว็บโดยอัตโนมัติ เพื่อป้องกันการถูกแอบดูรหัสจากไลฟ์สตรีม (Stream Sniping)',
  'profile.status': 'สถานะ:',
  'profile.statusActive': 'เปิดใช้งาน (ซ่อนรหัสและ QR Code)',
  'profile.statusOff': 'ปิดใช้งาน (แสดงผลปกติ)',
};

export type Lang = 'en' | 'th';

const TABLES: Record<Lang, Record<TranslationKey, string>> = { en, th };

export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
  // Unknown Thai strings fall back to English rather than rendering nothing.
  const text = TABLES[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match));
}
