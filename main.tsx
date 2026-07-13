import { useState } from "react";
import { 
  Building, 
  GraduationCap, 
  Sprout, 
  Heart, 
  Scale, 
  Laptop, 
  Search, 
  ArrowRight,
  Sparkles,
  Info,
  BookOpen,
  Briefcase
} from "lucide-react";

interface KnowledgeBaseProps {
  onSelectQuery: (query: string) => void;
}

export default function KnowledgeBase({ onSelectQuery }: KnowledgeBaseProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const categories = [
    { id: "ALL", label: "All Topics", icon: Sparkles },
    { id: "EDUCATION", label: "Students & Academia", icon: GraduationCap },
    { id: "AGRICULTURE", label: "Agriculture & Farming", icon: Sprout },
    { id: "CITIZEN", label: "Government & NID/Passport", icon: Building },
    { id: "BUSINESS", label: "Business & Tax Returns", icon: Briefcase },
    { id: "LAWS", label: "Laws & Civil Rights", icon: Scale },
    { id: "HEALTHCARE", label: "Healthcare & Surokkha", icon: Heart }
  ];

  const prompts = [
    {
      category: "CITIZEN",
      title: "NID Spelling & DOB Correction",
      description: "How to correct names, parentage, and Date of Birth errors online on the services.nidw.gov.bd portal.",
      promptText: "How do I apply for National ID (NID) card correction? What are the required documents (like SSC certificate/passport) and fees?",
      badge: "Official Citizen Procedure"
    },
    {
      category: "CITIZEN",
      title: "e-Passport Application and Timelines",
      description: "Fees, delivery times, and verification steps for regular (21 days) vs. Super Express (2 days) passports.",
      promptText: "What are the fees, delivery timelines (Regular, Express, Super Express), and police clearance rules for Bangladeshi e-Passport applications?",
      badge: "Passports Portal"
    },
    {
      category: "LAWS",
      title: "Fundamental Constitutional Rights",
      description: "The 18 fundamental human rights guaranteed to citizens under Part III of the Bangladesh Constitution.",
      promptText: "What are the 18 fundamental rights guaranteed to citizens under Part III of the Constitution of Bangladesh? Explain key ones like Article 27, 32, and 39.",
      badge: "National Laws"
    },
    {
      category: "AGRICULTURE",
      title: "Rice Blast Disease Diagnostics",
      description: "Symptoms of spindle-shaped lesions and neck rot in BRRI rice, and recommended Tricyclazole fungicides.",
      promptText: "What is Rice Blast disease? What are its symptoms on leaves/necks, and what preventative methods or fungicides (like Tricyclazole) are recommended for Bangladeshi farmers?",
      badge: "Crop Protection"
    },
    {
      category: "AGRICULTURE",
      title: "Low-Interest Krishi Rin (Crop Loan)",
      description: "Required Krishi Card, bank accounts, and 4% concessional crop credit policies from Bangladesh Bank.",
      promptText: "How can farmers access low-interest crop loans (Krishi Rin) under Bangladesh Bank rules? What documents (like Krishi Card, Khatian, Sonali Bank account) are required?",
      badge: "Farming Credit"
    },
    {
      category: "HEALTHCARE",
      title: "Dengue Warning & Platelet Drop",
      description: "Aedes mosquito control, joint pain symptoms, and platelet warning counts under official health circulars.",
      promptText: "What are the key prevention methods for Dengue fever in Bangladesh? At what platelet count level is it critical to consult a hospital, and what medicines should be strictly avoided?",
      badge: "Public Health Alert"
    },
    {
      category: "EDUCATION",
      title: "HSC & SSC CGPA Calculations",
      description: "Formula for Grade Point Average, grade percentages (A+ is 80%+), and fourth subject points weights.",
      promptText: "How is the Grade Point Average (GPA/CGPA) calculated for SSC and HSC exams in Bangladesh? Show the 5-point scale structure and how optional subjects are added.",
      badge: "High School Scale"
    },
    {
      category: "BUSINESS",
      title: "Trade License Zonal Registration",
      description: "Acquiring commercial business trade licenses in City Corporations, required partnership deeds, and fees.",
      promptText: "How do I register and obtain a commercial Trade License in Dhaka City Corporation? What documents (like lease deeds or articles of association) are needed and how often is it renewed?",
      badge: "Commercial License"
    },
    {
      category: "EDUCATION",
      title: "Public University Cluster Admissions",
      description: "MCQ structure, subjects weight, and preparation tips for GST, DU, and BUET engineering tests.",
      promptText: "What is the cluster admission (GST) and Dhaka University (DU) exam pattern for public university entry in Bangladesh? What topics are critical for preparation?",
      badge: "University Admissions"
    },
    {
      category: "BUSINESS",
      title: "Online individual Tax Return filing",
      description: "Online filing on etaxnbr.gov.bd, 350K BDT exemption limits, and Sanchayapatra tax rebates.",
      promptText: "Who is required to file individual Income Tax Returns in Bangladesh? How does individual filing on the e-Return portal (etaxnbr.gov.bd) work, and what are the tax slabs?",
      badge: "NBR e-Taxation"
    },
    {
      category: "LAWS",
      title: "Cyber Security Act Defamation Defenses",
      description: "Core CSA rules regarding hacking, cyberbullying, defamation, and Facebook harassment support centers.",
      promptText: "What are the main rules in the Cyber Security Act (CSA) of Bangladesh regarding hacking, digital defamation, and online harassment? How can victims contact Police Cyber Support?",
      badge: "Cyber Security"
    },
    {
      category: "HEALTHCARE",
      title: "Surokkha Portal Vaccine Registry",
      description: "Identity verification with NID/Birth certificate, scheduled SMS center alerts, and QR passport download.",
      promptText: "How do I register on the Surokkha vaccination portal (surokkha.gov.bd) and download a QR-verified official Vaccine Certificate?",
      badge: "Vaccines Portal"
    }
  ];

  const filteredPrompts = prompts.filter(p => {
    const matchesCategory = activeCategory === "ALL" || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.promptText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-bg-base">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Suggested Prompts Portal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose from highly optimized and pre-configured queries tailored for Bangladeshi students, teachers, farmers, businesses, and citizens.
          </p>
        </div>

        {/* Local Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search suggested prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A100D]/80 border border-emerald-900/25 focus:border-emerald-500/40 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-xs text-slate-300 placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* Categories Horizontal scroller */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-emerald-900/15 scrollbar-thin">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all shrink-0 border ${
                isActive 
                  ? "bg-emerald-900/20 border-emerald-500/20 text-emerald-400 font-semibold" 
                  : "bg-[#0A100D]/80 border-emerald-900/15 text-slate-400 hover:text-slate-200 hover:border-emerald-900/25"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompts Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((p, i) => (
            <div 
              key={i} 
              className="p-4.5 rounded-xl border border-emerald-900/20 bg-[#0A100D]/40 hover:bg-[#0A100D]/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                    {p.category}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{p.badge}</span>
                </div>
                <h3 className="font-display font-bold text-sm text-slate-100 mb-1 leading-tight">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{p.description}</p>
                <div className="p-3 bg-[#050807]/60 rounded-lg border border-emerald-900/10 text-[11px] text-slate-500 leading-relaxed font-mono max-h-24 overflow-y-auto mb-4 scrollbar-thin">
                  &quot;{p.promptText}&quot;
                </div>
              </div>
              <button
                onClick={() => onSelectQuery(p.promptText)}
                className="w-full py-2 bg-[#050807]/80 border border-emerald-900/35 hover:border-emerald-500/30 hover:bg-emerald-900/10 text-slate-300 hover:text-emerald-400 font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Ask AI Assistant This Prompt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 p-12 text-center rounded-xl border border-emerald-900/20 bg-[#0A100D]/20 space-y-2">
            <Info className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">No matching suggested prompts found.</p>
            <p className="text-xs text-slate-600">Try searching for keywords like &apos;NID&apos;, &apos;GPA&apos;, &apos;Rice&apos;, or &apos;Tax&apos;.</p>
          </div>
        )}
      </div>

    </div>
  );
}
