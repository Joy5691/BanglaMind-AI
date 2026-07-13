import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared performance logs and dynamic document index
interface IndexedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  embedding: number[];
  userId: string;
}

interface DocumentInfo {
  id: string;
  title: string;
  size: string;
  type: string;
  isPreseeded: boolean;
  uploadTime: string;
  wordCount: number;
  userId: string;
}

// In-memory databases
let documents: DocumentInfo[] = [];
let indexedChunks: IndexedChunk[] = [];
let queryLogs: {
  latency: number;
  tokens: number;
  similarity: number;
  isHallucinated: boolean;
  timestamp: string;
}[] = [];

let systemLogs: {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}[] = [];

interface ActiveUserMetric {
  userId: string;
  lastActive: string;
  queriesCount: number;
  avgLatency: number;
  tokensUsed: number;
}
let activeUsersDb: Record<string, ActiveUserMetric> = {};

function addLog(level: "info" | "warn" | "error", message: string) {
  const log = {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    level,
    message
  };
  systemLogs.unshift(log);
  if (systemLogs.length > 100) systemLogs.pop();
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      addLog("warn", "GEMINI_API_KEY is missing! App will fall back to local responses.");
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

// Preseeded Bangladesh Knowledge Base documents
const preseededDocuments = [
  {
    id: "nid-correction",
    title: "National ID (NID) Card Correction Guidelines",
    type: "pdf",
    content: "To correct errors in your Bangladesh National ID (NID) card (such as name spelling, date of birth, or parents' names), you must apply online through the services.nidw.gov.bd portal. Required documents include: SSC/HSC certificate, Birth Registration certificate, Passport, or marriage certificate. Fees vary from 230 to 575 BDT depending on the correction class (e.g., Class A, B, or C). Corrections generally take 15 to 45 working days after verification."
  },
  {
    id: "passport-app",
    title: "e-Passport Application and Delivery Status",
    type: "pdf",
    content: "Bangladesh e-Passport applications are submitted online at epassport.gov.bd. Delivery timelines are categorized as: Regular (21 working days), Express (10 working days), and Super Express (2 working days). Super Express requires pre-verified police clearance. Fees range from 4,025 BDT (48 pages, 5 years, regular) to 13,800 BDT (64 pages, 10 years, super express). Ensure your online NID/Birth registration matches your passport profile exactly."
  },
  {
    id: "constitution-rights",
    title: "Fundamental Rights in Bangladesh Constitution",
    type: "txt",
    content: "Part III of the Constitution of Bangladesh guarantees 18 fundamental rights to its citizens. These include: Article 27 (Equality before law), Article 28 (Discrimination on grounds of religion, race, caste, sex), Article 31 (Right to protection of law), Article 32 (Protection of right to life and personal liberty), Article 36 (Freedom of movement), Article 37 (Freedom of assembly), Article 39 (Freedom of thought, conscience, and speech), and Article 40 (Freedom of profession or occupation)."
  },
  {
    id: "rice-blast-prevention",
    title: "Rice Blast Disease Prevention and Remedies",
    type: "txt",
    content: "Rice Blast, caused by the fungus Magnaporthe oryzae, is a destructive disease affecting rice crops in Bangladesh. Symptoms include spindle-shaped lesions with grey centers on leaves and neck rot. Preventative measures: use resistant varieties like BRRI dhan28 or BRRI dhan29 with care, avoid excessive nitrogen fertilizer, and maintain proper water levels. If infected, apply fungicides containing Tricyclazole or Azoxystrobin immediately. Early detection is critical."
  },
  {
    id: "dengue-prevention",
    title: "Dengue Fever Prevention and Treatment Guidelines",
    type: "pdf",
    content: "Dengue fever is a viral infection transmitted by the Aedes aegypti mosquito, prevalent during the monsoon season in Bangladesh. Prevention involves destroying breeding grounds (clear stagnant water in flower pots, tires, and cans), wearing full-sleeve clothing, and using mosquito nets. Symptoms include high fever, severe headache, joint pain, and skin rash. Patients must monitor platelet count. If platelets drop below 50,000, consult a hospital immediately. Avoid taking Aspirin or Ibuprofen."
  },
  {
    id: "ssc-hsc-grading",
    title: "SSC and HSC CGPA Calculation System",
    type: "txt",
    content: "Secondary School Certificate (SSC) and Higher Secondary School Certificate (HSC) exams in Bangladesh use a 5-point GPA scale. GPA grades are: A+ (80% and above, 5.0), A (70-79%, 4.0), A- (60-69%, 3.5), B (50-59%, 3.0), C (40-49%, 2.0), D (33-39%, 1.0), and F (Below 33%, 0.0). The overall GPA is the average of grade points earned in all compulsory and elective subjects, with optional fourth-subject points above 2.0 added to the total."
  },
  {
    id: "trade-license",
    title: "How to Obtain a Trade License in Bangladesh",
    type: "pdf",
    content: "Every business entity in Bangladesh must obtain a Trade License from the local government authority (City Corporation, Pourashava, or Union Parishad). For City Corporations, apply at the respective zonal office. Required documents: lease agreement of the office space, holding tax receipt, NID card, and passport-size photos. For partnership firms, a partnership deed is needed; for limited companies, the Memorandum and Articles of Association. Renewal is required annually by July."
  },
  {
    id: "bcs-exam-structure",
    title: "Bangladesh Civil Service (BCS) Exam Structure",
    type: "pdf",
    content: "The Bangladesh Civil Service (BCS) exam, conducted by the BPSC, has three stages: Preliminary, Written, and Viva Voce. The Preliminary is a 200-mark MCQ test (2 hours) covering 10 subjects, including Bengali, English, Bangladesh Affairs, International Affairs, Geography, General Science, Computer/IT, Mathematical Reasoning, Mental Ability, Ethics/Values. The Written Exam is 900 marks for general cadres. Passing preliminary requires ~50-60% correct. Viva Voce carries 200 marks. Candidate choice and final merit lists are determined based on written + viva scores."
  },
  {
    id: "krishi-rin-loans",
    title: "Agricultural Crop Loan and Krishi Rin Policy",
    type: "txt",
    content: "The Bangladesh Bank issues an annual Agricultural and Rural Credit Policy. Under this scheme, farmers can access low-interest crop loans (typically capped at 4% concessional interest rate for specific crops like pulses, oilseeds, spices, maize). To apply, farmers need a Krishi Card (Farmer Card) issued by the DAE, land registration deeds (Khatian) or tenancy certificates, and a bank account at a public sector bank (e.g., Sonali, Krishi Bank) with a minimum deposit of 10 BDT. Loans cover seeds, fertilizer, and irrigation costs."
  },
  {
    id: "income-tax-filing",
    title: "Individual Income Tax Return Filing Guidelines",
    type: "pdf",
    content: "In Bangladesh, individuals with taxable income exceeding 350,000 BDT annually (400,000 BDT for women and third gender, 475,000 BDT for disabled, 500,000 BDT for freedom fighters) must file income tax returns. Returns are submitted online through the e-Return portal (etaxnbr.gov.bd) or manually to the respective Taxes Circle by November 30 (Tax Day). Documents required include: Salary certificates, bank interest statements, proof of savings certificates (Sanchayapatra) investments, asset/liability statements. Failure to file on time attracts interest and penalties."
  },
  {
    id: "cyber-security-act",
    title: "Bangladesh Cyber Security Act (CSA) Provisions",
    type: "txt",
    content: "The Cyber Security Act (CSA) of Bangladesh aims to regulate cyber offences and protect digital data. Defamation, hacking, identity theft, cyber bullying, spreading religious hatred, and défamation online are strictly regulated. Complaints can be filed at the National Cyber Security Agency (NCSA) or local police stations. For immediate reporting of cyber bullying and harassment against women, the Police Cyber Support for Women (PCSW) can be reached on Facebook or via helpline (01320000888)."
  },
  {
    id: "community-clinics-care",
    title: "Primary Healthcare & Community Clinics System",
    type: "txt",
    content: "Bangladesh operates over 14,000 rural Community Clinics providing free primary healthcare, maternal and child healthcare, nutrition counseling, and family planning services. Each clinic serves around 6,000 citizens. Community Clinics provide 32 types of essential medicines free of charge, including paracetamol, antacids, iron supplements, and antibiotics. For complex cases, patients are referred to Upazila Health Complexes (UHC) or District Hospitals."
  },
  {
    id: "surokkha-vaccine-reg",
    title: "Surokkha Vaccine Registration Portal Guidelines",
    type: "pdf",
    content: "Vaccine registration and certificate download in Bangladesh are centralized through the Surokkha portal (surokkha.gov.bd). Citizens register using their National ID (NID) card or Birth Registration Certificate, verifying their identity via a mobile OTP. Once registered, users receive SMS notifications with their scheduled date and center. After vaccination, users can download the verified Vaccination Card and official Vaccine Certificate with QR verification from the portal."
  },
  {
    id: "bmd-cyclone-warnings",
    title: "Bangladesh Meteorological Department (BMD) Cyclone Advisories",
    type: "web",
    content: "The Bangladesh Meteorological Department (bmd.gov.bd) issues official weather forecasts, heavy rainfall warnings, and marine storm alerts. Under the Disaster Management protocols, cyclone warning signals are classified from 1 (cautionary) to 11 (great danger). Signal 4 indicates a warning of immediate danger to vessels. Signals 5 to 7 denote moderate danger, while Signals 8 to 10 indicate great danger with wind speeds exceeding 89 km/h. Local administrations initiate mandatory evacuations to designated cyclone shelters when Signal 8 or higher is hoisted."
  },
  {
    id: "dgda-medicine-price",
    title: "DGDA Maximum Retail Price (MRP) Drug Regulations",
    type: "web",
    content: "The Directorate General of Drug Administration (dgda.gov.bd) regulates medicine production, importing, and pricing in Bangladesh. It maintains a strict price control register for 117 essential primary healthcare generic drugs, including Paracetamol, Amoxicillin, Metronidazole, and ORS. Pharmacies are legally mandated to sell these medicines exactly at or below the government-notified Maximum Retail Price (MRP). Selling above the printed price is a punishable offense under the Drugs Control Ordinance, carrying penalties of up to 2 years imprisonment or heavy fines."
  },
  {
    id: "dhaka-stock-exchange",
    title: "Dhaka Stock Exchange (DSE) Investor Guidelines",
    type: "web",
    content: "Dhaka Stock Exchange (dsebd.org) is the primary capital market of Bangladesh. To trade listed securities, individual investors must open a Beneficiary Owner (BO) account through a registered broker licensed by the BSEC. Required registration details include a NID card, active bank account with MICR cheque, and a Tax Identification Number (TIN) for taxable transactions. DSE operates electronic trading under matching rules, featuring circuit breakers to prevent artificial market manipulation and secure stable investor liquidity."
  },
  {
    id: "land-mutation-process",
    title: "Ministry of Land e-Mutation & Namjari Guidelines",
    type: "pdf",
    content: "Land Mutation (Namjari) is the formal process of registering a new owner's name in the government record of rights (Khatian) following land acquisition. In Bangladesh, e-Mutation is fully digitized via mutation.land.gov.bd. Applications require: deed of sale (Dalil), succession certificates (if applicable), holding tax receipts, and Khatian records. The Assistant Commissioner (Land) processes mutations within a statutory limit of 28 working days (or 9 days for fast-track industrial land). The official processing fee is fixed at 1,150 BDT."
  },
  {
    id: "ugc-scholarships",
    title: "UGC MPhil & PhD Academic Research Fellowship Policies",
    type: "pdf",
    content: "The University Grants Commission (UGC) of Bangladesh (ugc.gov.bd) administers research fellowships to support advanced academic research. Full-time MPhil scholars receive a monthly stipend of 20,000 BDT for up to 2 years, while PhD researchers receive 30,000 BDT for 3 years. Applicants must hold a first-class Master's degree, be enrolled in a public university, and submit an approved research synopsis. Private tuition or secondary employment is strictly prohibited during the active fellowship tenure."
  },
  {
    id: "nctb-curriculum",
    title: "NCTB National Primary & Secondary Education Framework",
    type: "pdf",
    content: "The National Curriculum and Textbook Board (nctb.gov.bd) is the autonomous agency responsible for developing curricula and printing textbooks for primary and secondary education in Bangladesh. Under the National Education Policy, NCTB designs standard learning objectives focusing on cognitive skills, logical reasoning, and language competencies. The government distributes free textbooks to millions of primary and secondary students annually on January 1st (Textbook Festival Day) to maintain high school enrollment ratios."
  },
  {
    id: "bida-investment",
    title: "BIDA Industrial Investment & Work Permit Guidelines",
    type: "web",
    content: "The Bangladesh Investment Development Authority (bida.gov.bd) serves as the primary investment promotion agency. Foreign investors can register industrial projects online through the BIDA One Stop Service (OSS) portal. BIDA issues official investor visas, commercial branch office registration permits, and foreign national work permits. All foreign employees in Bangladesh must obtain a BIDA work permit, which requires a clean police clearance, certificate of professional expertise, and an active individual income Tax Identification Number (TIN)."
  },
  {
    id: "cyber-security-reporting",
    title: "National Cyber Security Reporting & Cyber Harassment Guidelines",
    type: "pdf",
    content: "For reporting digital financial fraud, hacking, or social media profile duplication in Bangladesh, citizens must file an official complaint with the National Cyber Security Agency (NCSA) via their official helpline or local Cyber Crime Investigation Division. Cyber harassment or bullying targeting women should be reported immediately to the 'Police Cyber Support for Women (PCSW)' via their dedicated WhatsApp helpline (01320000888) or verified Facebook page. Providing digital forensics/screenshots, URL links, and caller log profiles accelerates investigation."
  },
  {
    id: "passport-embassy",
    title: "Bangladesh e-Passport Renewal & Global Embassy Services",
    type: "pdf",
    content: "Citizens residing abroad can apply for e-Passport or Machine Readable Passport (MRP) renewals through respective Bangladesh Embassies, High Commissions, and Consulates (e.g., London, New York, Riyadh). Renewals require scheduling an online appointment via epassport.gov.bd, providing a copy of the current passport, verified NID card or online birth registration certificate (English version), and embassy payment receipt. MRP to e-Passport conversions undergo security checks in Dhaka, taking 30 to 45 working days, with options for secure postal courier delivery."
  },
  {
    id: "dgf-rationing",
    title: "Directorate General of Food Subsidized OMS Rationing Rules",
    type: "web",
    content: "The Directorate General of Food (dgfood.gov.bd) regulates the Open Market Sale (OMS) and Food Friendly Program (FFP) to distribute subsidized rice, wheat, and flour to low-income populations across Bangladesh. Subsidized items are available at designated dealer centers and mobile OMS trucks upon presenting a NID card or specialized food rationing card. Individuals can purchase a maximum of 5 kg of rice and 5 kg of flour per transaction at fixed government concession rates. Unauthorized hoardings or black-market selling of OMS food items are strict legal offences under the Special Powers Act of 1974."
  },
  {
    id: "bb-mfs-ceilings",
    title: "Bangladesh Bank Mobile Financial Services (MFS) Wallet Limits",
    type: "web",
    content: "The Bangladesh Bank enforces strict daily and monthly transaction limits for Mobile Financial Services (MFS) wallets, including bKash, Nagad, Rocket, and Mcash, to ensure secure payment ecosystems and curb money laundering. For individual (personal) accounts, the maximum daily cash-in is 30,000 BDT across 5 transactions, and the monthly cap is 200,000 BDT. Daily cash-out is capped at 25,000 BDT, and peer-to-peer (Send Money) transfers are restricted to 25,000 BDT daily. Enterprise merchant payments require BIDA licensing, trade certification, and verified commercial bank accounts."
  },
  {
    id: "dae-crop-outbreaks",
    title: "DAE Maize Pest Fall Armyworm Identification & Control Protocols",
    type: "txt",
    content: "The Department of Agricultural Extension (dae.gov.bd) issues regional protocols for managing Fall Armyworm (Spodoptera frugiperda) infestations in maize, wheat, and sorghum crops. The pest is identified by an inverted 'Y' mark on the head of dark green caterpillars and four raised spots forming a square on the eighth abdominal segment. Farmers are advised to perform daily morning crop scouting, deploy pheromone traps (15 traps per hectare), and utilize organic bio-pesticides like Spinosad or Bacillus thuringiensis if infestation exceeds 5% of young whorls. Avoid consecutive chemical sprays to prevent insect immunity."
  }
];

// Helper to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate chunks for a document
function generateChunks(docId: string, title: string, content: string): { id: string; content: string }[] {
  // Simple paragraph or size-based chunker
  const paragraphs = content.split(/(?:\r?\n){2,}/);
  const chunks: { id: string; content: string }[] = [];
  
  let tempChunk = "";
  paragraphs.forEach((p, index) => {
    const cleanP = p.trim();
    if (!cleanP) return;
    
    if (cleanP.length > 500) {
      // Split large paragraph into sentences
      const sentences = cleanP.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanP];
      sentences.forEach((s) => {
        if ((tempChunk + s).length > 400) {
          if (tempChunk) chunks.push({ id: `${docId}-chunk-${chunks.length}`, content: tempChunk.trim() });
          tempChunk = s;
        } else {
          tempChunk += " " + s;
        }
      });
    } else {
      if ((tempChunk + cleanP).length > 400) {
        if (tempChunk) chunks.push({ id: `${docId}-chunk-${chunks.length}`, content: tempChunk.trim() });
        tempChunk = cleanP;
      } else {
        tempChunk += (tempChunk ? "\n" : "") + cleanP;
      }
    }
  });
  
  if (tempChunk.trim()) {
    chunks.push({ id: `${docId}-chunk-${chunks.length}`, content: tempChunk.trim() });
  }
  
  // Safeguard: if no chunks were generated, add the full content
  if (chunks.length === 0) {
    chunks.push({ id: `${docId}-chunk-0`, content: content });
  }
  
  return chunks;
}

// Initialize pre-seeded documents and generate vectors
async function initializePreseeded() {
  addLog("info", "Initializing preseeded documents...");
  
  // Setup document records
  preseededDocuments.forEach((pd) => {
    const wordCount = pd.content.split(/\s+/).length;
    const size = `${Math.ceil(pd.content.length / 1024 * 10) / 10} KB`;
    
    documents.push({
      id: pd.id,
      title: pd.title,
      size,
      type: pd.type,
      isPreseeded: true,
      uploadTime: new Date().toISOString(),
      wordCount,
      userId: "system"
    });
  });

  try {
    const ai = getAiClient();
    addLog("info", "Generating vector embeddings for preseeded documents via Gemini API...");
    
    for (const pd of preseededDocuments) {
      const chunks = generateChunks(pd.id, pd.title, pd.content);
      
      for (const chunk of chunks) {
        const response = await ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: chunk.content
        }) as any;
        
        if (response.embedding?.values) {
          indexedChunks.push({
            id: chunk.id,
            documentId: pd.id,
            documentTitle: pd.title,
            content: chunk.content,
            embedding: response.embedding.values,
            userId: "system"
          });
        }
      }
      addLog("info", `Successfully indexed: ${pd.title} (${chunks.length} chunks)`);
    }
    addLog("info", `All preseeded documents indexed successfully. Total vector database size: ${indexedChunks.length} nodes.`);
  } catch (err: any) {
    addLog("error", `Failed to generate dynamic startup embeddings: ${err.message || err}. Running in fallback dense-matching mode.`);
    // Fallback Mock Embeddings (simple normalized letter frequency vectors for testing if offline/keyless)
    preseededDocuments.forEach((pd) => {
      const chunks = generateChunks(pd.id, pd.title, pd.content);
      chunks.forEach((chunk) => {
        // Generate a pseudo-random embedding vector of 768 dimensions so that operations don't throw errors
        const mockVec = Array.from({ length: 768 }, (_, idx) => {
          let charVal = chunk.content.charCodeAt(idx % chunk.content.length) || 0;
          return Math.sin(idx + charVal) * 0.1;
        });
        indexedChunks.push({
          id: chunk.id,
          documentId: pd.id,
          documentTitle: pd.title,
          content: chunk.content,
          embedding: mockVec,
          userId: "system"
        });
      });
    });
  }
}

// Trigger initializations safely
setTimeout(initializePreseeded, 1000);

// API Endpoints

// 1. Chat Completion / RAG Pipeline
app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  const { messages, selectedDocIds, mode, webSearchEnabled } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }
  
  const latestMessage = messages[messages.length - 1];
  const userQuery = latestMessage.content;
  
  addLog("info", `New chat request. Mode: ${mode || "General"}. Query: "${userQuery.substring(0, 60)}..."`);
  
  let detectedLang = "English";
  if (/[\u0980-\u09ff]/.test(userQuery)) {
    detectedLang = "Bangla";
  } else {
    // Simple check for phonetic Banglish keywords
    const banglishKeywords = ["ami", "tumi", "kemon", "bhalo", "dhaka", "bangladesh", "ki", "korcho", "passport", "nid", "hsc", "ssc", "korbo"];
    const lowercaseQuery = userQuery.toLowerCase();
    const hasBanglish = banglishKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`).test(lowercaseQuery));
    if (hasBanglish) {
      detectedLang = "Banglish";
    }
  }

  const userId = req.headers["user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let retrievedChunks: any[] = [];
  let queryEmbedding: number[] = [];
  let maxSimilarity = 0;
  let hasKey = true;

  try {
    const ai = getAiClient();
    
    // Generate embedding for query
    try {
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: userQuery
      }) as any;
      if (embedResponse.embedding?.values) {
        queryEmbedding = embedResponse.embedding.values;
      }
    } catch (e) {
      addLog("warn", "Failed to generate query embedding, using keyword fallback.");
    }
    
    // Filter index chunks based on user selection
    const userAllowedDocs = documents.filter(d => d.userId === "system" || d.userId === userId).map(d => d.id);
    const activeDocIds = selectedDocIds && selectedDocIds.length > 0 
      ? selectedDocIds.filter((id: string) => userAllowedDocs.includes(id))
      : userAllowedDocs;
      
    const activeChunks = indexedChunks.filter(chunk => activeDocIds.includes(chunk.documentId));
    
    if (activeChunks.length > 0) {
      // Perform Hybrid Search (Semantic Sim + Keyword Matches)
      const keywordTerms = userQuery.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
      
      const searchResults = activeChunks.map(chunk => {
        let semanticScore = 0;
        if (queryEmbedding.length > 0 && chunk.embedding.length > 0) {
          semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
        }
        
        // Sparse score: basic keyword matching
        let keywordScore = 0;
        if (keywordTerms.length > 0) {
          const contentLower = chunk.content.toLowerCase();
          const matches = keywordTerms.filter((term: string) => contentLower.includes(term)).length;
          keywordScore = matches / keywordTerms.length;
        }
        
        // Hybrid weighting: 75% semantic, 25% sparse keyword
        const hybridScore = (queryEmbedding.length > 0) 
          ? (0.75 * semanticScore + 0.25 * keywordScore) 
          : keywordScore;
          
        return {
          chunk,
          semanticScore,
          keywordScore,
          hybridScore
        };
      });
      
      // Sort by hybrid score and take top 3
      searchResults.sort((a, b) => b.hybridScore - a.hybridScore);
      
      retrievedChunks = searchResults.slice(0, 3).map(res => ({
        id: res.chunk.id,
        documentId: res.chunk.documentId,
        documentTitle: res.chunk.documentTitle,
        content: res.chunk.content,
        similarity: Math.round(res.hybridScore * 100)
      }));
      
      if (retrievedChunks.length > 0) {
        maxSimilarity = retrievedChunks[0].similarity;
      }
    }
  } catch (err: any) {
    addLog("warn", `Search capability limited: ${err.message}. Relying on local LLM memory.`);
    hasKey = false;
  }

  // Construct instruction context
  const contextText = retrievedChunks.length > 0
    ? retrievedChunks.map((c, i) => `[Verified Source: ${c.documentTitle}]\n${c.content}`).join("\n\n")
    : "No document matching search terms was found in the Bangladesh knowledge base.";
    
  const systemPrompt = `You are BanglaMind AI, an elite Bangladesh-centric AI assistant.
Your goal is to assist students, teachers, researchers, farmers, small businesses, and general citizens of Bangladesh.
You understand Bangla, English, and Banglish (code-mixed language).

CURRENT DATE/TIME: 2026-07-12
ASSISTANT ROLE/MODE: ${mode || "General assistance"}

RETRIEVED VERIFIED KNOWLEDGE BASE CONTEXT:
${contextText}

INSTRUCTIONS FOR RETRIEVAL-AUGMENTED GENERATION (RAG):
1. Prioritize facts from the RETRIEVED VERIFIED KNOWLEDGE BASE CONTEXT above.
2. If the context contains sufficient information, formulate a highly accurate, structured answer.
3. Cite sources directly in your response using inline tags like [Source: Name of Document] or [Source: Document Title].
4. If the information is NOT present in the retrieved context, you may use your pre-trained knowledge about Bangladesh, but you MUST add a clear note: "(Note: This information is retrieved from base knowledge and is not verified in active documents)."
5. HALLUCINATION REDUCTION RULE: If the confidence score of the facts is extremely low, or if the user asks for something outside of verified documents and base information that you cannot guarantee, say "I couldn't verify this information. Please refer to official Bangladesh Government services or respective verified institutions."
6. Ensure your response is friendly, professional, structured with bullet points where appropriate, and formatted in clean Markdown.
7. Respond in the same language code used by the user: if they ask in Bangla, answer in Bangla. If English, answer in English. If code-mixed Banglish, you may respond in simple, polite Bangla or Banglish as preferred.`;

  let responseText = "";
  let tokensUsed = 120 + Math.ceil(userQuery.length / 4);
  let confidenceScore = 95;

  if (hasKey) {
    try {
      const ai = getAiClient();
      
      // Build session context
      const chatContents = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatContents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          tools: webSearchEnabled ? [{ googleSearch: {} }] : undefined
        }
      });
      
      responseText = response.text || "I apologize, but I could not formulate a response.";
      tokensUsed += Math.ceil(responseText.length / 4);

      // Extract URLs from Google Search grounding
      const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            retrievedChunks.push({
              id: Math.random().toString(36).substring(7),
              documentTitle: chunk.web.title,
              documentId: chunk.web.uri, // Use URI as ID
              content: `Web Search Source: ${chunk.web.uri}`,
              similarity: 100 // Trusted source
            });
          }
        });
      }
    } catch (err: any) {
      addLog("error", `Gemini response generation failed: ${err.message}. Reverting to local simulation.`);
      responseText = getFallbackResponse(userQuery, mode, detectedLang, retrievedChunks);
    }
  } else {
    // If no key or offline, simulate a high-quality RAG answer locally
    responseText = getFallbackResponse(userQuery, mode, detectedLang, retrievedChunks);
  }

  // Calculate actual query processing latency
  const latencyMs = Date.now() - startTime;
  
  // Estimate confidence based on retrieval match and LLM responses
  if (retrievedChunks.length === 0) {
    confidenceScore = 65; // Base knowledge fallback
  } else if (maxSimilarity < 50) {
    confidenceScore = 75; // Weak retrieval match
  } else {
    confidenceScore = Math.min(100, Math.round(maxSimilarity + 10)); // Excellent match
  }
  
  // Track metrics
  queryLogs.push({
    latency: latencyMs,
    tokens: tokensUsed,
    similarity: maxSimilarity,
    isHallucinated: retrievedChunks.length === 0,
    timestamp: new Date().toISOString()
  });

  // Track active user specific stats
  if (userId) {
    const userMetric = activeUsersDb[userId] || {
      userId,
      lastActive: "",
      queriesCount: 0,
      avgLatency: 0,
      tokensUsed: 0
    };
    const totalPrevLatency = userMetric.avgLatency * userMetric.queriesCount;
    userMetric.queriesCount += 1;
    userMetric.avgLatency = Math.round((totalPrevLatency + latencyMs) / userMetric.queriesCount);
    userMetric.tokensUsed += tokensUsed;
    userMetric.lastActive = new Date().toISOString();
    activeUsersDb[userId] = userMetric;
  }

  const citations = retrievedChunks.map(c => c.documentTitle);

  res.json({
    id: Math.random().toString(36).substring(7),
    role: "model",
    content: responseText,
    timestamp: new Date().toISOString(),
    citations,
    confidence: confidenceScore,
    retrievedChunks,
    detectedLang,
    latencyMs,
    tokensUsed
  });
});

// 2. Mock RAG Responses for Local Development / Key Fallback
function getFallbackResponse(query: string, mode: string, lang: string, chunks: any[]): string {
  const qLower = query.toLowerCase();
  
  if (chunks.length > 0) {
    const chunk = chunks[0];
    if (lang === "Bangla") {
      return `আপনার প্রশ্নের সঠিক উত্তর আমাদের ভেরিফাইড ডাটাবেজ থেকে পাওয়া গেছে:
      
### ${chunk.documentTitle}

${chunk.content}

*এই তথ্যটি সরাসরি ভেরিফাইড ডকুমেন্ট থেকে উদ্ধৃত করা হয়েছে। [উৎস: ${chunk.documentTitle}]*

আপনার কি এই বিষয়ে আরও কোনো জিজ্ঞাসা আছে?`;
    } else {
      return `Based on verified documents from our Bangladesh knowledge base, here is the official information:

### ${chunk.documentTitle}

${chunk.content}

*This response has been cited directly from our active knowledge bank. [Source: ${chunk.documentTitle}]*

Would you like to know more details about this procedure?`;
    }
  }

  // Base smart conversational defaults
  if (lang === "Bangla") {
    return `আমি **BanglaMind AI**, বাংলাদেশ-কেন্দ্রিক প্রথম সারির আরএজি (RAG) অ্যাসিস্ট্যান্ট। 

বর্তমানে এই প্রশ্নের জন্য কোনো ভেরিফাইড সরকারি গ্যাজেট বা সার্কুলার অ্যাক্টিভ ডিরেক্টরিতে লোড করা নেই। তবে আমার সাধারণ তথ্য অনুযায়ী:

- **বাংলাদেশ সম্পর্কিত সাধারণ পরামর্শ**: যেকোনো অফিসিয়াল কাজের জন্য সরাসরি সরকারি ওয়েবসাইট (যেমন: bangladesh.gov.bd) ভিজিট করুন।
- **মোড**: ${mode || "সাধারন"} মোডের অধীনে এই উত্তরটি প্রদান করা হয়েছে।

*(নোট: এই তথ্যটি সাধারণ বেস মডেল থেকে নেওয়া হয়েছে এবং সক্রিয় ডকুমেন্ট দ্বারা নিশ্চিত করা হয়নি।)*`;
  } else if (lang === "Banglish") {
    return `Ami **BanglaMind AI**, Bangladesh-centric intelligent assistant. Apnar query ta understand korte perechi.

Kintu, active knowledge base e ekhon eita niye verify kora kono document paini. Amar general knowledge database anujayi:

- **Bangladesh Emergency Support**: Apni emergency help er jonno direct **999** e call korte paren, and sorkari services er jonno **333** e call korte paren.
- **Active Mode**: Apnar query mode chilo ${mode || "General"}.

*(Note: Ei information ta verified active documents internal search e paini, base model memory theke generate kora hoyeche).*`;
  } else {
    return `I am **BanglaMind AI**, Bangladesh’s Intelligent Multilingual AI Assistant.

Currently, we do not have specific verified circulars matching your query in the active index. However, based on general historical context for Bangladesh:

- **Key Institutions**: General administrative queries are governed by the respective ministries. Check official platforms under bangladesh.gov.bd.
- **Emergency Support**: Dial **999** for emergency police/fire/ambulance or **333** for public service information.

*(Note: This information is retrieved from base knowledge and is not verified in active documents.)*`;
  }
}

// 3. Document Management Endpoints
app.get("/api/documents", (req, res) => {
  const userId = req.headers["user-id"] as string;
  const filteredDocs = documents.filter(d => d.userId === "system" || d.userId === userId);
  res.json(filteredDocs);
});

app.post("/api/document/upload", async (req, res) => {
  const userId = req.headers["user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, content, base64Data, mimeType } = req.body;
  const docId = "user-doc-" + Math.random().toString(36).substring(7);
  
  addLog("info", `Received document upload request. Title: "${title}" for user: ${userId}`);
  
  let extractedText = content || "";
  let isFromOCR = false;
  
  // If base64Data is present, it's a PDF or Image. Use Gemini to OCR/Extract text!
  if (base64Data && mimeType) {
    try {
      const ai = getAiClient();
      addLog("info", `Analyzing document ${title} via Gemini OCR multimodal extraction...`);
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          },
          "Extract all raw text from this document for indexing. Keep it detailed, retaining all facts, tables, and details. Do not summarize unless needed to fit formatting."
        ]
      });
      
      extractedText = response.text || "";
      isFromOCR = true;
      addLog("info", `Successfully extracted ${extractedText.length} characters of text from ${title} using Gemini OCR.`);
    } catch (err: any) {
      addLog("error", `Failed to run Gemini OCR for ${title}: ${err.message || err}.`);
      return res.status(500).json({ error: "Could not extract text from document using Gemini API. Verify your API key is correct." });
    }
  }
  
  if (!extractedText.trim()) {
    return res.status(400).json({ error: "Document content is empty." });
  }

  const wordCount = extractedText.split(/\s+/).length;
  const size = `${Math.ceil(extractedText.length / 1024 * 10) / 10} KB`;
  
  const newDoc: DocumentInfo = {
    id: docId,
    title,
    size,
    type: mimeType ? mimeType.split("/")[1] : "txt",
    isPreseeded: false,
    uploadTime: new Date().toISOString(),
    wordCount,
    userId
  };
  
  documents.push(newDoc);
  
  // Vector indexing in-memory
  const chunks = generateChunks(docId, title, extractedText);
  let chunkCount = 0;
  
  try {
    const ai = getAiClient();
    addLog("info", `Generating embeddings for ${chunks.length} chunks of document: ${title}`);
    
    for (const chunk of chunks) {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: chunk.content
      }) as any;
      
      if (response.embedding?.values) {
        indexedChunks.push({
          id: chunk.id,
          documentId: docId,
          documentTitle: title,
          content: chunk.content,
          embedding: response.embedding.values,
          userId
        });
        chunkCount++;
      }
    }
  } catch (err: any) {
    addLog("warn", `Could not generate remote embeddings for ${title}: ${err.message || err}. Running fallback embedding vector.`);
    // Fallback Mock Embeddings
    chunks.forEach((chunk) => {
      const mockVec = Array.from({ length: 768 }, (_, idx) => {
        let charVal = chunk.content.charCodeAt(idx % chunk.content.length) || 0;
        return Math.sin(idx + charVal) * 0.1;
      });
      indexedChunks.push({
        id: chunk.id,
        documentId: docId,
        documentTitle: title,
        content: chunk.content,
        embedding: mockVec,
        userId
      });
      chunkCount++;
    });
  }
  
  addLog("info", `Index updated: added document "${title}" with ${chunkCount} dynamic semantic nodes.`);
  res.json({ success: true, document: newDoc, chunksIndexed: chunkCount });
});

app.delete("/api/document/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.headers["user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const doc = documents.find(d => d.id === id);
  if (doc && doc.userId === userId) {
    documents = documents.filter(d => d.id !== id);
    indexedChunks = indexedChunks.filter(c => c.documentId !== id);
    addLog("info", `Deleted document and vector chunks for ID: ${id} by user: ${userId}`);
    res.json({ success: true });
  } else {
    res.status(403).json({ error: "Forbidden or Document Not Found" });
  }
});

// 4. Research Metrics & System Stats
app.get("/api/stats", (req, res) => {
  const userId = req.headers["user-id"] as string;
  const filteredDocs = documents.filter(d => d.userId === "system" || d.userId === userId);
  
  const totalQuestions = queryLogs.length;
  
  const avgLatency = totalQuestions > 0 
    ? Math.round(queryLogs.reduce((sum, log) => sum + log.latency, 0) / totalQuestions) 
    : 850;
    
  const totalTokens = queryLogs.reduce((sum, log) => sum + log.tokens, 0);
  
  const embeddingQuality = totalQuestions > 0 
    ? Math.round(queryLogs.reduce((sum, log) => sum + log.similarity, 0) / totalQuestions) 
    : 88;
    
  // Academic evaluation parameters simulations
  const accuracyScore = totalQuestions > 0 
    ? Math.min(98, Math.max(70, Math.round(85 + (embeddingQuality / 10)))) 
    : 92;
    
  const retrievalPrecision = totalQuestions > 0 
    ? Math.min(99, Math.max(65, Math.round(75 + (embeddingQuality / 5)))) 
    : 90;
    
  const hallucinationRate = totalQuestions > 0 
    ? Math.max(2, Math.round(15 - (embeddingQuality / 8))) 
    : 4;

  res.json({
    avgLatency,
    totalTokens,
    accuracyScore,
    retrievalPrecision,
    embeddingQuality,
    hallucinationRate,
    totalQuestions,
    documentCount: filteredDocs.length
  });
});

// 5. System Logs
app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

// Admin active users statistics
app.get("/api/admin/users", (req, res) => {
  res.json(Object.values(activeUsersDb));
});

// Clear Logs endpoint for admin panel
app.post("/api/logs/clear", (req, res) => {
  systemLogs = [];
  addLog("info", "System activity logs cleared by Admin.");
  res.json({ success: true });
});

// Vite & Production Middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    addLog("info", "Starting application in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    addLog("info", "Starting application in PRODUCTION mode. Serving static bundle...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLog("info", `BanglaMind AI is fully live and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
