Let me get more detailed information about the types and complete file structure.Based on my comprehensive analysis of your **Harvest_Rentals-** (aka **Rentapp Smart Platform**) repository, here's a complete understanding of the project and all its entities:

---

## 🏢 **PROJECT OVERVIEW**

**Rentapp** is a premium, IoT-driven **property management system** designed for sustainable and simplified residential management in Nepal. It provides property owners with granular control over utilities (especially electricity) and complete resident lifecycle management. The system features deterministic billing, real-time consumption monitoring, and AI-powered communication.

**Demo Property**: KunwarNiwas  
**Login**: `admin` / `admin`  
**Tech Stack**: React 19, TypeScript, Tailwind CSS, Recharts, Google Gemini AI, Lucide React

---

## 📊 **CORE ENTITIES & DATA MODELS**

### 1️⃣ **Unit** (Property/Room Entity)
```typescript name=types.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/types.ts#L39-L47
export interface Unit {
  id: string;
  number: string;
  floor: number;
  status: UnitStatus;
  safetyLimitAmps: number;
  currentResidentId?: string;
  imageUrl?: string;
}
```

**Status States (UnitStatus enum)**:
- `ACTIVE` - Normal operation
- `GRACE_PERIOD` - Low balance warning
- `CURTAILED` - Power/service restricted due to zero balance
- `MAINTENANCE` - Under repair/offline

**Behavior**: 22+ units with IoT sub-meters, safety limits (typically 32A), automatic curtailment when resident balance hits zero.

---

### 2️⃣ **Resident** (Tenant Entity)
```typescript name=types.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/types.ts#L26-L37
export interface Resident {
  id: string;
  name: string;
  unitId: string;
  balance: number;
  dailyRate: number; // Rs per day (fixed rate)
  daysRemaining: number;
  lastKwhReading: number;
  moveInDate: string;
  avatarUrl?: string;
  subscriptions?: AddonService[];
}
```

**Key Properties**:
- **Daily Rate**: Fixed Rs/day burn rate (typically Rs 55-65/day)
- **Balance**: Prepaid account system
- **daysRemaining**: Auto-calculated from balance ÷ dailyRate
- **Subscriptions**: Optional addon services

---

### 3️⃣ **AddonService** (Utility Add-ons)
```typescript name=types.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/types.ts#L17-L24
export interface AddonService {
  id: string;
  name: string;
  status: 'Active' | 'Suspended' | 'Pending';
  monthlyRate: number;
  type: 'Electricity' | 'Internet' | 'Waste' | 'Water' | 'Security';
}
```

**Purpose**: Additional services beyond base electricity (WiFi, waste management, water, security systems).

---

### 4️⃣ **SystemEvent** (Audit Log Entry)
```typescript name=types.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/types.ts#L49-L55
export interface SystemEvent {
  id: string;
  timestamp: string;
  unitId: string;
  type: EventType;
  description: string;
  signature: string; // HMAC-SHA256 mock
}
```

**Event Types (EventType enum)**:
- `MEASUREMENT` - kWh consumption logging
- `STATE_CHANGE` - Unit status transitions
- `PAYMENT` - Payment received
- `ALERT` - System warnings
- `MANUAL_OVERRIDE` - Admin interventions

**Purpose**: Immutable audit trail with cryptographic signatures for non-repudiation.

---

### 5️⃣ **Task** (To-Do Management)
```typescript name=pages/Tasks.tsx url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/pages/Tasks.tsx#L16-L23
interface Task {
  id: string;
  text: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  financialLink?: boolean;
}
```

**Categories**: Maintenance, Financial, Compliance  
**Purpose**: Property management task tracking with financial system integration.

---

### 6️⃣ **Transaction** (Financial Ledger)
```typescript name=services/mockData.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/services/mockData.
ts#L70-L76
export interface Transaction {
  id: string;
  date: string;
  type: 'Payment' | 'Consumption' | 'Adjustment' | 'Penalty';
  amount: number;
  description: string;
}
```

**Purpose**: Double-entry accounting system tracking payments, daily utility consumption, credits, and penalties.

---

### 7️⃣ **JournalEntry** (Daily Log/Accounting)
```typescript name=pages/DailyLog.tsx url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/pages/DailyLog.tsx#L17-L24
interface JournalEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
}
```

**Purpose**: Manual accounting entries for rent collection, utility bills, maintenance expenses.

---

### 8️⃣ **Loan** (Resident Financing)
Used in `LoanManagement.tsx` for issuing advances to residents:
```typescript
{
  id: string;
  residentId: string;
  principal: number;
  interest: string;
  balance: number;
  progress: number;
  due: string;
}
```

---

### 9️⃣ **Party/Vendor** (Third-Party Payments)
Used in `PartyPayments.tsx`:
```typescript
{
  id: string;
  name: string;
  category: string;
  balance: number;
  lastPay: string;
  status: string;
}
```

---

## 🗂️ **PROJECT STRUCTURE**

````markdown name=README.md url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/README.md#L23-L42
## 🏗 Project Structure

- `/pages`: Modular UI for Dashboard, Residents, Units, and Communication.
- `/services`: Mock data layer and Gemini API integrations.
- `/components`: Reusable UI Layouts and brand assets.
````

**Page Components** (17 total):
1. **Dashboard** - "The Pulse" - KPI overview, building health
2. **ResidentHub** - Tenant directory with search/filter
3. **RegisterResident** - Onboard new tenants
4. **Units** - 22-unit grid with IoT status monitoring
5. **ProvisionUnit** - Deploy new unit/meter
6. **Financials** - Treasury management, payment processing
7. **Communication** - AI-powered SMS/email (Gemini integration)
8. **AuditLog** - Immutable event ledger
9. **DailyLog** - Manual journal entries
10. **Tasks** - Property to-do list
11. **LoanManagement** - Resident credit/advances
12. **PartyPayments** - Vendor/supplier payment tracking
13. **TenantDashboard** - Resident-facing portal
14. **LoginPage** - Authentication
15. **LoginSelection** - Role selection (Owner/Tenant)
16. **Tenants** - (older version found)
17. **Rooms** - (older version found)

---

## 🔑 **KEY BUSINESS LOGIC**

### **Eco-Smart Utility System**
1. **Prepaid Model**: Residents top-up balance (like mobile recharge)
2. **Daily Burn Rate**: Fixed Rs/day deduction (e.g., Rs 65/day)
3. **Auto-Curtailment**: When `balance <= 0`, unit transitions to `CURTAILED` status
4. **Grace Period**: Warning alerts when `daysRemaining < 7`
5. **Safety Limits**: 32A circuit breakers prevent overload

### **AI Features** (Gemini API)
```typescript name=services/geminiService.ts url=https://github.com/Rbimochan/Harvest_Rentals-/blob/592d1c49ccac32f085c4ef2864789b8c771120b7/services/geminiService.ts#L2-L18
export const generateRedAlertMessage = async (tenantName: string, balance: number, daysLate: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a firm "Red Alert" SMS for RentApp (Nepal). Tenant: ${tenantName}, Balance: Rs. ${balance}, Status: ${daysLate > 0 ? 'Payment overdue' : 'Low balance'}. Tone: Professional, IoT-driven, firm. Max 140 chars. Include 'RentApp'.`,
  });
  
  return response.text || "Message generation failed.";
};
```

---

## 🎨 **VISUAL DESIGN SYSTEM**

- **Dark Navy Primary**: `#050B3E`
- **Slate Grays**: `#252D3A`, `#94a3b8`
- **Emerald Accents**: For positive states (Active, payments)
- **Rose/Red**: Alerts, curtailed units
- **Amber**: Grace period warnings
- **Rounded Corners**: 16-64px for premium feel
- **Typography**: Plus Jakarta Sans (bold, uppercase tracking)

---

## 🔐 **AUTHENTICATION**

- **Two Roles**: Owner (admin) / Tenant (resident)
- **Owner Login**: `admin` / `admin`
- **Tenant Login**: Unit-based (e.g., `t-subash` for demo tenant)
- Demo tenant dashboard shows consumption, balance, and "Living Logic Panel" controls

---

## 📡 **MOCK DATA**

Located in `services/mockData.ts`:
- 22 mock units across 3 floors
- 5+ mock residents
- Kunwar Niwas building imagery
- Transaction history
- System events with HMAC signatures

---

## 🚀 **STATE MANAGEMENT**

Centralized in `App.tsx`:
```tsx
const [residents, setResidents] = useState(initialResidents);
const [units, setUnits] = useState(initialUnits);
const [maintenanceRequests, setMaintenanceRequests] = useState([...]);
```

Props drilling to child components for real-time updates.

---

## 💡 **UNIQUE FEATURES**

1. **IoT Integration Ready**: Safety limits, consumption logging, state machines
2. **Blockchain-Inspired Audit**: Cryptographic event signatures
3. **Nepal Market Specific**: Nepali Rupees (Rs), E-Sewa payment integration mentions
4. **Dual Portal**: Separate dashboards for owners vs. tenants
5. **Financial Ecosystem**: Loans, vendors, daily ledger, treasury
6. **AI Communication**: Automated reminder generation
7. **Real-time Visualizations**: Recharts for consumption trends

---

This is a **PropTech Infrastructure Platform** - essentially a **smart building operating system** combining IoT, fintech, and property management into a unified dashboard. The architecture is modular, type-safe (TypeScript), and designed for scalability to multiple properties.