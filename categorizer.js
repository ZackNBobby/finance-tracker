// categorizer.js — Singapore DBS merchant category matching

const CATEGORIES = [
  {
    id: 'food',
    name: 'Food & Drinks',
    icon: '🍔',
    color: '#f59e0b',
    keywords: [
      'GRAB*FOOD','GRABFOOD','FOODPANDA','FOOD PANDA','DELIVEROO','MCDONALD','KFC','TEXAS CHICKEN',
      'PIZZA HUT','DOMINO','SUBWAY','STARBUCKS','COSTA COFFEE','TOAST BOX','YA KUN','BENGAWAN',
      'BREAD TALK','BREADTALK','OLD CHANG KEE','KOPITIAM','KOUFU','FOOD REPUBLIC','HAWKER',
      'WINGSTOP','POPEYES','SHAKE SHACK','FIVE GUYS','BURGER KING','PAPA JOHN','CRYSTAL JADE',
      'SAKURA INTERNATIONAL','SUSHI','RAMEN','RESTAURANT','EATERY','CAFE ','CAFÉ ','COFFEE ',
      'BUBBLE TEA','KOPI ','LIHO','GONG CHA','TIGER SUGAR','THE ALLEY','KURA SUSHI','DIN TAI FUNG',
      'PUTIEN','PARADISE DYNASTY','SWENSENS','JOLLIBEAN','POLAR PUFF','J CO ','OLD TOWN ',
      'PIZZA EXPRESS','MARCHE','POULET','PEPPER LUNCH','ICHIBAN SUSHI','ICHIBAN BOSHI',
      'NOODLE','CHICKEN RICE','CHAR SIEW','WAR-KOR-DIN','JUMBO','NEWTON','FOOD COURT',
      'CANTEEN','CAFETERIA','BAKERY','PATISSERIE','CONFECTIONERY','DESSERT','ICE CREAM',
      'MALA','HOTPOT','BBQ','BAR ','PUB ','BISTRO','BRASSERIE','TAPAS','BRUNCH',
      'MR BEAN','BENGAWAN SOLO','BENGAWA','SECRET RECIPE','BENGAWAN'
    ]
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚌',
    color: '#3b82f6',
    keywords: [
      'GRAB ','GOJEK','TADA ','COMFORT TAXI','COMFORTDELGRO','CDG TAXI','TRANSIT','SBS ',
      'SMRT ','EZ-LINK','EZLINK','EZ LINK','TAPGO','BUS ','MRT ','LRT ',
      'SHELL ','CALTEX','ESSO ','SPC ','PETROL','FUEL ','PARKING','URA PARKING',
      'HDB CARPARK','HDB CAR PARK','SEASON PARKING','MOTOR','CAR WASH','WORKSHOP',
      'AUTOBACS','BORNEO MOTORS','GRAB EXPRESS','CONTINENTAL','PREMIER TAXI',
      'SMRT TAXI','TRANS-CAB','PRIME TAXI','TIGER TAXI','RYDE ','BLUECABS'
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#8b5cf6',
    keywords: [
      'LAZADA','SHOPEE','AMAZON','AMZN','QXPRESS','NTUC FAIRPRICE','FAIRPRICE','NTUC ',
      'COLD STORAGE','GIANT ','SHENG SIONG','SHENGSIONG','POPULAR ','COURTS ',
      'HARVEY NORMAN','IKEA','H&M ','ZARA ','UNIQLO','COTTON ON','CHARLES & KEITH',
      'PEDRO ','BATA ','METRO ','ROBINSON','TANGS ','ISETAN','SEPHORA','ZALORA',
      'KLOOK','CHALLENGER','BEST DENKI','AUDIO HOUSE','PAYPAL','TAOBAO','ALIEXPRESS',
      'SAMSUNG ','APPLE ONLINE','APPLE.COM','GUARDIAN ','WATSONS','WATSON ','WATSON\'S',
      'COLDSTORAGE','PRIME SUPERMARKET','HAO MART','TEKKA CENTRE','TEKKA MARKET',
      'MUSTAFA','BEST ','SIM LIM','FUNAN','COURTS MEGA','EZBUY','QPAY',
      'SPOTLIGHT','DAISO','DON DON DONKI','DONKI','MUJI ','MINISO'
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    color: '#ec4899',
    keywords: [
      'NETFLIX','SPOTIFY','GOOGLE PLAY','YOUTUBE','DISNEY+','DISNEY PLUS','HBO ',
      'PRIME VIDEO','APPLE MUSIC','STEAM ','STEAMGAMES','PLAYSTATION','NINTENDO',
      'XBOX ','GOLDEN VILLAGE','GV CINEMAS','GV ','SHAW ','CATHAY CINEPLEXES','CATHAY ',
      'SISTIC','TICKETMASTER','SPORT SINGAPORE','ACTIVE SG','ACTIVSG',
      'SWIMMING','GYM ','FITNESS','ANYTIME FITNESS','CELEBRITY FITNESS','PURE FITNESS',
      'JETTS ','VIRGIN ACTIVE','F45 ','CROSSFIT','YOGA','PILATES'
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '💊',
    color: '#10b981',
    keywords: [
      'CLINIC','HOSPITAL','DENTAL','DOCTOR','MEDICAL','PHARMACY','POLYCLINIC',
      'NTUC HEALTH','PARKWAY SHENTON','RAFFLES MEDICAL','RAFFLES HOSPITAL',
      'SINGHEALTH','NATIONAL UNIV HOSPITAL','NUH ','MOUNT ELIZABETH','GLENEAGLES',
      'THOMSON MEDICAL','FARRER PARK','GUARDIAN PHARMACY','UNITY PHARMACY',
      'WATSONS PHARMACY','OPTOMETRIST','OPTICIAN','PHYSIOTHERAPY','PSYCHOTHERAPY',
      'DENTAL CLINIC','EYE CLINIC'
    ]
  },
  {
    id: 'utilities',
    name: 'Utilities & Bills',
    icon: '💡',
    color: '#f97316',
    keywords: [
      'SP GROUP','SP SERVICES','SP POWERGRID','SINGTEL','STARHUB','M1 LIMITED',
      'M1 SHOP','MYREPUBLIC','CIRCLES','TPG TELECOM','SIMBA','REDONE',
      'INCOME INSURANCE','NTUC INCOME','GREAT EASTERN','PRUDENTIAL','AIA ',
      'AVIVA ','MANULIFE','FWD ','TOKIO MARINE','RAFFLES HEALTH','SAF ',
      'CPF ','MEDISHIELD','CDAC ','MBMF ','TOWN COUNCIL','HDB CONSERVANCY',
      'INSURANCE','PREMIUM ','SUBSCRIPTION'
    ]
  },
  {
    id: 'paynow',
    name: 'PayNow / PayLah',
    icon: '📱',
    color: '#06b6d4',
    keywords: [
      'FAST PAYMENT','PAYNOW','PAYLAH','PAY LAH','DBS PAYLAH','FAST TRSF',
      'FAST TRF','IBG ','GIRO ','STANDING INSTR','INTERBANK GIRO',
      'TRANSFER TO','TRANSFER OUT','FUND TRANSFER','REMITTANCE'
    ]
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    color: '#0ea5e9',
    keywords: [
      'SINGAPORE AIRLINES','SIA ','SILKAIR','SCOOT ','JETSTAR','AIR ASIA','AIRASIA',
      'CATHAY PACIFIC','MALAYSIA AIRLINES','THAI AIRWAYS','QANTAS','EMIRATES',
      'QATAR ','LUFTHANSA','HOTEL ','AGODA','BOOKING.COM','AIRBNB','EXPEDIA',
      'CHANGI AIRPORT','CHANGI RECOMMENDS','DFS ','DUTY FREE','TRAVEL ',
      'RESORT ','VILLA ','KLOOK'
    ]
  }
];

const SKIP_PATTERNS = [
  /BALANCE\s+(B\/F|C\/F|BROUGHT FORWARD|CARRIED FORWARD)/i,
  /^(SUB[-\s]?TOTAL|TOTAL BALANCE|PREVIOUS BALANCE|MINIMUM (SUM )?DUE)/i,
  /PAYMENT RECEIVED|PAYMENT - THANK YOU|AUTOPAY|AUTO PAY/i,
  /ANNUAL (MEMBERSHIP )?FEE/i,
  /GIRO PAYMENT|AUTO DEDUCTION/i,
];

function categorize(description) {
  if (!description) return 'other';
  const upper = description.toUpperCase();

  for (const re of SKIP_PATTERNS) {
    if (re.test(upper)) return null;
  }

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (upper.includes(kw.trim())) return cat.id;
    }
  }

  return 'other';
}

function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || { id: 'other', name: 'Others', icon: '💭', color: '#64748b' };
}

function getAllCategories() {
  return [...CATEGORIES, { id: 'other', name: 'Others', icon: '💭', color: '#64748b' }];
}
