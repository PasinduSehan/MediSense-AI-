import React, { useState } from 'react';
import { User } from '../types';
import { 
  Brain, 
  Salad, 
  Activity, 
  Wind, 
  Sparkles, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Leaf, 
  Compass, 
  ShieldAlert,
  Dumbbell,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConditionInsightProps {
  user: User;
}

// Highly specific clinical-grade dynamic tips database
interface ConditionData {
  displayName: string;
  themeColor: {
    primary: string;
    text: string;
    bg: string;
    border: string;
    bgHover: string;
  };
  foodsToSuggest: Array<{ name: string; benefit: string }>;
  foodsToAvoid: Array<{ name: string; reason: string }>;
  relaxationTechniques: Array<{ title: string; desc: string; steps: string[] }>;
  dailyHabits: Array<{ action: string; category: string; impact: string }>;
  clinicalSigns: Array<{ symptom: string; urgency: string; instruction: string }>;
  triviaTips: string[];
}

const INSIGHTS_DB: Record<string, ConditionData> = {
  Diabetes: {
    displayName: "Diabetes Management",
    themeColor: {
      primary: "bg-indigo-600",
      text: "text-indigo-400",
      bg: "bg-indigo-950/20",
      border: "border-indigo-500/20",
      bgHover: "hover:bg-indigo-500/10"
    },
    foodsToSuggest: [
      { name: "Leafy Greens (Spinach, Kale)", benefit: "Extremely low in digestible carbs and contains lutein, which shields diabetic eyesight." },
      { name: "Chia Seeds & Flaxseeds", benefit: "Vastly rich in viscous fiber, which slows down the rate at which food moves through the gut and is absorbed." },
      { name: "Greek Yogurt", benefit: "Probiotics improve glycemic control & reduce cardiovascular risk factors." },
      { name: "Fatty Fish (Salmon, Sardines)", benefit: "Omega-3 fats protect blood vessels from high inflammation & oxidative stressors." }
    ],
    foodsToAvoid: [
      { name: "Sugar-Sweetened Beverages", reason: "Spikes blood insulin rapidly and contributes to visceral fat accumulation." },
      { name: "White Bread, Rice & Pasta", reason: "Refined carbs with high glycemic index that act essentially like pure sugar upon digestion." },
      { name: "Fruit-Flavored Packaged Yogurts", reason: "Often loaded with upwards of 15-20g of added high-fructose corn syrups." }
    ],
    relaxationTechniques: [
      {
        title: "Post-Meal Diaphragmatic Breathwork",
        desc: "Deep slow breaths trigger parasympathetic state to mitigate stress-related cortisol spikes which elevate blood glucose.",
        steps: ["Inhale slowly into your belly for 4 seconds", "Hold for 4 seconds", "Exhale completely for 6 seconds", "Repeat for 5 cycles immediately after dining"]
      },
      {
        title: "Mindful Muscle Scanning",
        desc: "Releases chronic neuromuscular tension that contributes to diabetic neuropathy distress.",
        steps: ["Close eyes and focus on toe sensations", "Progressively tense and release muscles traveling upwards", "Synchronize with deep inhalation cycles"]
      }
    ],
    dailyHabits: [
      { action: "15-Minute Post-Meal Walk", category: "Circulatory Physical", impact: "Triggers insulin-independent muscle glucose absorption instantly." },
      { action: "Hydration Synchronization", category: "Renal Clearance", impact: "Facilitates excess glucose flushing through kidneys." },
      { action: "Fasting Baseline Verification", category: "Logging Habit", impact: "Guards against the 'Dawn Phenomenon' early glucose surge." }
    ],
    clinicalSigns: [
      { symptom: "Extreme persistent polyuria or polydipsia", urgency: "High Urgency", instruction: "Check for ketone levels immediately and consult your physician." },
      { symptom: "Unexplained blurry vision & dizzyness", urgency: "Moderate", instruction: "Indicates rapid osmotic shifts in the lenses of the eyes. Re-verify glucose indices." }
    ],
    triviaTips: [
      "Did you know? Walking at a moderate pace for just 15 minutes after a meal reduces blood glucose spikes by up to 50% compared to remaining seated.",
      "Clinical Insight: Cortisol (the stress hormone) directly triggers gluconeogenesis in the liver, meaning stress can raise your blood sugar even if you haven't eaten a single gram of sugar!",
      "A fiber intake of over 40 grams daily has been clinically shown to significantly lower glycated hemoglobin (HbA1c) levels."
    ]
  },
  Depression: {
    displayName: "Depression & Mood Heuristics",
    themeColor: {
      primary: "bg-purple-600",
      text: "text-purple-400",
      bg: "bg-purple-950/20",
      border: "border-purple-500/20",
      bgHover: "hover:bg-purple-500/10"
    },
    foodsToSuggest: [
      { name: "Walnuts & Pumpkin Seeds", benefit: "Rich source of plant-derived Omega-3 fatty acids and magnesium to aid neural plasticity." },
      { name: "Fermented Foods (Kefir, Kimchi)", benefit: "Strengthens the gut microbiome. Over 90% of your body's serotonin receptors are nested in the gut!" },
      { name: "Berries (Blueberries, Blackberries)", benefit: "Polyphenon antioxidants fight systemic low-grade brain inflammation associated with depressive states." }
    ],
    foodsToAvoid: [
      { name: "Heavy Caffeine & Energy Drinks", reason: "Temporary dopamine surge followed by a severe adenosine crash that exacerbates panic or exhaustion." },
      { name: "Refined Baked Pastries", reason: "Causes neurochemical fluctuations that disrupt emotional stability thresholds." }
    ],
    relaxationTechniques: [
      {
        title: "Physiological Sigh Breathing Protocol",
        desc: "Clinically proven by neurobiologists to instantly reduce autonomic heart-rate arousal and anxiety.",
        steps: ["Take a deep inhalation through the nose", "Take a secondary sharp sneak inhalation to fully inflate your alveoli", "Release the breath through a slow, long sigh", "Perform 3 times for immediate brain reset"]
      },
      {
        title: "Autonomous Somatic Grounding (5-4-3-2-1 Menu)",
        desc: "Detaches cognitive focus from recursive negative rumination loops into real physical space.",
        steps: ["Name 5 things you can visually see in this room", "Touch 4 tangible textures around you", "Listen for 3 distinct audio frequencies", "Identify 2 aromatic scents", "Taste 1 actual sensory flavor"]
      }
    ],
    dailyHabits: [
      { action: "15-minute Outdoor Morning Sunlight Blast", category: "Circadian Alignment", impact: "Locks in melatonin decay cycle and optimizes cortisol timing to improve night sleep." },
      { action: "Micro-victory Scheduling", category: "Dopamine Recalibration", impact: "Breaks paralysis by executing tasks that take under 2 minutes (e.g. making bed)." },
      { action: "Emotional Vocabulary Mapping", category: "Somatic Logging", impact: "Prefrontal cortex activation reduces amygdala hyperactivity when feelings are explicitly named." }
    ],
    clinicalSigns: [
      { symptom: "Continuous persistent withdrawal symptoms & absolute anhedonia", urgency: "High Actionable", instruction: "Inform your core clinical support unit or counseling coordinator today." },
      { symptom: "Insomnia matching early morning awakening", urgency: "Moderate", instruction: "Indicates profound circadian dysregulation. Reach out to sleep specialists." }
    ],
    triviaTips: [
      "Serotonin Shield: 90% of serotonin is synthesized in your gut. Your microbiome acts as a direct neural pipeline ('The Vagus Nerve') to your emotional centers.",
      "Movement Therapy: Just 2.5 hours of moderate-intensity aerobic exercise a week has been shown to reduce depressive symptoms by nearly 30-40% in clinical trials."
    ]
  },
  Hypertension: {
    displayName: "Hypertension (Cardio Shield)",
    themeColor: {
      primary: "bg-rose-600",
      text: "text-rose-400",
      bg: "bg-rose-950/20",
      border: "border-rose-500/20",
      bgHover: "hover:bg-rose-500/10"
    },
    foodsToSuggest: [
      { name: "Bananas & Avocados", benefit: "Supercharged in Potassium, which supports sodium excretion through urine & reduces blood vessel pressure." },
      { name: "Red Beet Juices", benefit: "Exceptional nitric oxide nitrates that promote immediate systemic vasodilation of arteries." },
      { name: "Regular Oats", benefit: "Beta-glucan fibers reduce total blood pressure markers and support endothelial functions." }
    ],
    foodsToAvoid: [
      { name: "Processed Canned Packaged Soups", reason: "Can contain up to 1000mg+ of high sodium preservatives per single serving." },
      { name: "Salt Shakers & Pickled Menus", reason: "Directly causes systematic fluid retention, stressing vascular walls." }
    ],
    relaxationTechniques: [
      {
        title: "Standard 4-7-8 Deep Meditative Wave",
        desc: "Strong natural sedative for blood pressure triggers and cardiac pace regulation.",
        steps: ["Exhale completely through your mouth with a 'whoosh' sound", "Inhale silently through the nose for 4 seconds", "Hold the breath securely for 7 seconds", "Exhale audibly through your mouth for 8 seconds. Repeat for 4 cycles"]
      },
      {
        title: "Slow-Paced Vasodilation Audio Rest",
        desc: "Listening to rhythmic nature ambiance for 12 minutes promotes systematic blood vessel elasticity.",
        steps: ["Wear comfortable stereo headphones", "Lower ambient lights", "Focus exclusively on natural river and rain acoustic signatures"]
      }
    ],
    dailyHabits: [
      { action: "Isometric Handgrip Squeeze", category: "Endothelial Training", impact: "Promotes nitric oxide release upon grip relaxation, reducing baseline systolic blood pressure." },
      { action: "Sodium-Potassium Ratio Pivot", category: "Dietary Science", impact: "Actively choose high potassium items to counter dietary sodium retention naturally." },
      { action: "Calm Commute Auditing", category: "Aggressiveness Control", impact: "Avoid high traffic stressors by leaving 10 minutes early to limit adrenal pressure." }
    ],
    clinicalSigns: [
      { symptom: "Sudden headache at occipital lobe with chest tight pain", urgency: "Critical Alert", instruction: "Measure blood pressure immediately. Seek physical medical attention if systolic stays over 180." },
      { symptom: "Random epistaxis (nosebleeds) or extreme lightheadedness", urgency: "High Warning", instruction: "Vascular wall shear stress is too elevated. Record vitals and take resting medications." }
    ],
    triviaTips: [
      "Did you know? Every 1g reduction in your daily sodium intake corresponds roughly to a 2-3 mmHg reduction in systolic blood pressure.",
      "Cardio Fact: Nitric oxide levels in your blood system peak during physical breathing exercises, relaxing arterial walls and offering immediate blood pressure drops."
    ]
  },
  "Anemia": {
    displayName: "Anemia Management",
    themeColor: {
      primary: "bg-red-600",
      text: "text-red-400",
      bg: "bg-red-950/20",
      border: "border-red-500/20",
      bgHover: "hover:bg-red-500/10"
    },
    foodsToSuggest: [
      { name: "Spinach, Lentils & Red Meat", benefit: "High concentration of heme and non-heme iron to directly replenish lagging hemoglobin storage." },
      { name: "Citrus Fruits (Oranges, Lemon)", benefit: "Rich in Vitamin C, which increases absorption rate of non-heme plant iron up to threefold." },
      { name: "Fortified Cereal Grits", benefit: "Supplements iron and essential folate to support healthy blood cell multiplication keys." }
    ],
    foodsToAvoid: [
      { name: "Black Tea & Coffee", reason: "Tannins and polyphenols bind to iron in digestive tract, preventing absorption." },
      { name: "Calcium Rich Milk & Antacids", reason: "Calcium competes directly with iron for absorption pathways in intestines." }
    ],
    relaxationTechniques: [
      {
        title: "Oxygen Preservation Breathing",
        desc: "Slow, shallow breathing is optimized for oxygen distribution when red blood cells are low.",
        steps: [
          "Sit comfortably with eyes closed",
          "Inhale softly for 3 seconds",
          "Pause briefly to let hemoglobin attract oxygen molecules",
          "Exhale for 5 seconds without straining"
        ]
      }
    ],
    dailyHabits: [
      { action: "Iron-Vitamin C Pairing", category: "Synergistic Intake", impact: "Always take iron supplements with orange juice to maximize bio-absorption." },
      { action: "Altitude Check pacing", category: "Exertion Boundary", impact: "Pace stairs and hikes to avoid sudden tissue hypoxia." }
    ],
    clinicalSigns: [
      { symptom: "Severe shortness of breath with pale tongue or lips", urgency: "Immediate Warning", instruction: "Check hemoglobin levels. Consult hematology coordinator." },
      { symptom: "Severe dizziness on standing suddenly (orthostatic vertigo)", urgency: "Moderate Warning", instruction: "Rise slowly from bed in stages to avoid fainting." }
    ],
    triviaTips: [
      "Anemia Fact: Folate (Vitamin B9) and Vitamin B12 are just as vital as iron for making healthy, well-shaped red blood cells.",
      "Biological Science: Drinking coffee within one hour of an iron-rich meal can slash iron absorption by up to 60-70%."
    ]
  },
  "Asthma": {
    displayName: "Asthma Care Pathway",
    themeColor: {
      primary: "bg-sky-600",
      text: "text-sky-400",
      bg: "bg-sky-950/20",
      border: "border-sky-500/20",
      bgHover: "hover:bg-sky-500/10"
    },
    foodsToSuggest: [
      { name: "Apples & Bananas", benefit: "Rich in antioxidants and potassium which has been epidemiologically linked to reduced wheezing." },
      { name: "Spinach & Sunflower Seeds", benefit: "High in magnesium, which helps relax airway smooth muscles in clinical trials." },
      { name: "Ginger & Garlic", benefit: "Possesses anti-inflammatory compounds that target immune responses and breathing tubes." }
    ],
    foodsToAvoid: [
      { name: "Processed Sulfite Foods (Dried Fruits, Wine)", reason: "Sulfites trigger immediate respiratory hyper-responsiveness and airway swelling." },
      { name: "Artificial Preservatives & Cold Soft Drinks", reason: "Sudden temperature drops in esophagus trigger reflexive airway narrowing." }
    ],
    relaxationTechniques: [
      {
        title: "Buteyko Reduced Breathing Practice",
        desc: "Shallow, paced nose-breathing helps prevent hyperventilation and naturally dilates airways.",
        steps: [
          "Breathe in gently through your nose",
          "Breathe out gently through your nose",
          "Hold your nose shut with your fingers for a count of 5",
          "Release and breathe calmly through your nose"
        ]
      },
      {
        title: "Pursed-Lip Respiratory Stabilization",
        desc: "Creates backpressure in airways, keeping them open wider during physical exertion.",
        steps: [
          "Relax neck and shoulders completely",
          "Inhale slowly through your nose for 2 seconds",
          "Pucker lips as if blowing a candle",
          "Exhale very slowly through pursed lips for 4 seconds"
        ]
      }
    ],
    dailyHabits: [
      { action: "Morning Peak Flow Calibration", category: "Pulmonary Audit", impact: "Foreshadows airway resistance changes before dynamic triggers start." },
      { action: "Dust & Pollen Barrier Audit", category: "Environmental Science", impact: "Checks air quality levels to avoid sudden particle exposures." }
    ],
    clinicalSigns: [
      { symptom: "Wheezing paired with retraction at ribs/neck", urgency: "Critical Crisis", instruction: "Administer rescue inhaler instantly. Seek urgent medical support if it persists." },
      { symptom: "Continuous dry hacking cough at midnight", urgency: "Moderate Warning", instruction: "Signals low-grade bronchial inflammation. Increase ambient humidity." }
    ],
    triviaTips: [
      "Did you know? Magnesium acts as a natural calcium channel blocker, which has been shown to assist in bronchial muscle relaxation.",
      "Pulmonary Fact: Mouth breathing bypasses the natural filtering, warming, and humidifying effects of nasal passages, making bronchial tubes more vulnerable."
    ]
  },
  "Chronic Kidney Disease": {
    displayName: "Renal Filtration Care",
    themeColor: {
      primary: "bg-amber-600",
      text: "text-amber-400",
      bg: "bg-amber-950/20",
      border: "border-amber-500/20",
      bgHover: "hover:bg-amber-500/10"
    },
    foodsToSuggest: [
      { name: "Onions, Garlic & Apples", benefit: "Low in potassium, sodium, and phosphorus, while packing anti-inflammatory protection." },
      { name: "Egg Whites", benefit: "High-quality, low-phosphorus pure protein source to prevent skeletal muscle wasting." },
      { name: "Blueberries & Red Grapes", benefit: "Provides antioxidant phytonutrients that safeguard delicate kidney filter cells." }
    ],
    foodsToAvoid: [
      { name: "Prunes, Bananas & Dark Sodas", reason: "Extremely high potassium and phosphorus content that compromised kidneys struggle to filter out." },
      { name: "Processed Canned Food & Excess Proteins", reason: "Puts heavy metabolic strain on filtration nephrons, elevating BUN baseline indices." }
    ],
    relaxationTechniques: [
      {
        title: "Nephron-Soothing Visual Reflection",
        desc: "Guided calming visualization to reduce stress-induced renal arterial constriction.",
        steps: [
          "Close eyes and imagine clean, flowing mountain streams",
          "Focus on slow, rhythmic belly breathing",
          "Visualize blood passing smoothly through healthy filters"
        ]
      }
    ],
    dailyHabits: [
      { action: "Fluid Intake Balance Audit", category: "Renal Workload", impact: "Aligns water intake bounds with primary filtering capacity to avoid fluid retention." },
      { action: "NSAID Avoidance Audit", category: "Chemical Safety", impact: "No ibuprofen or naproxen, which can cause acute kidney injury." }
    ],
    clinicalSigns: [
      { symptom: "Swelling in ankles/face (edema) with foamy or dark urine", urgency: "High Alert", instruction: "Indicates protein leakage and fluid overload. Contact your nephrologist immediately." },
      { symptom: "Severe swelling in face, tongue, or lower limbs", urgency: "Severe Danger", instruction: "May signal severe hypothyroidism or kidney complications. Seek immediate clinical assessment." }
    ],
    triviaTips: [
      "Kidney Fact: Your kidneys filter about 200 quarts of blood daily, extracting wastes and essential minerals to maintain perfect systemic balance.",
      "Clinical Directive: A single dose of standard NSAIDs (like ibuprofen) blocks kidney-protecting prostaglandins, temporarily choking off vital renal blood flow."
    ]
  },
  "Cardiovascular Concern": {
    displayName: "Coronary & Endothelial Shield",
    themeColor: {
      primary: "bg-rose-700",
      text: "text-rose-450",
      bg: "bg-rose-950/30",
      border: "border-rose-500/30",
      bgHover: "hover:bg-rose-500/15"
    },
    foodsToSuggest: [
      { name: "Extra Virgin Olive Oil", benefit: "Rich in monounsaturated oleic acid and heart-shielding phenols." },
      { name: "Oats, Barley & Walnuts", benefit: "Beta-glucan fibers sweep out excess arterial cholesterol. ALA Omega-3s calm vessel walls." },
      { name: "Garlic Extract & Seeds", benefit: "Allicin compounds promote endothelial flexibility, assisting in natural pressure control." }
    ],
    foodsToAvoid: [
      { name: "Deep Fried Foods & Margarine", reason: "Trans fats and saturated fats elevate plaque-forming LDL cholesterol levels." },
      { name: "Sugary Pastries & High Sodium snacks", reason: "Increases vascular wall friction and glycation of coronary arteries." }
    ],
    relaxationTechniques: [
      {
        title: "Autonomic Sympathovagal Reset",
        desc: "Reigns in hyper-activated stress responses to lower resting heart rate and arterial shear stress.",
        steps: [
          "Sit upright and drop your jaw slightly",
          "Inhale deeply into the chest for 5 seconds",
          "Hold for 2 seconds",
          "Exhale slowly through the mouth like a soft sigh for 7 seconds"
        ]
      }
    ],
    dailyHabits: [
      { action: "Endothelial Care Walking", category: "Endothelial Care", impact: "A steady, relaxed 20-minute daily walk stimulates arterial nitric oxide production." },
      { action: "Vitals Symmetry Tracking", category: "Safety Baselines", impact: "Observe both morning pulse pressure and resting heart rate stability metrics." }
    ],
    clinicalSigns: [
      { symptom: "Squeezing chest pain spreading to neck, jaw, or left arm", urgency: "Emergency Code Red", instruction: "Do not wait. Chew an aspirin and call emergency services instantly." },
      { symptom: "Sudden fluttering pulse paired with mild shortness of breath", urgency: "High Urgency", instruction: "Indicates potential arrhythmia. Sit down immediately, take deep breaths and contact cardiology." }
    ],
    triviaTips: [
      "Arterial Fact: Healthy blood vessels are lined with a fragile, single-cell layer called the endothelium, which synthesizes the protective vasodilator nitric oxide.",
      "Cardiovascular Insight: Consistent meditation can reduce the risk of heart attack or stroke by up to 48% over a five-year period by downregulating stress responses."
    ]
  },
  "Hypothyroidism": {
    displayName: "Thyroid & Endocrine Balance",
    themeColor: {
      primary: "bg-teal-600",
      text: "text-teal-400",
      bg: "bg-teal-950/20",
      border: "border-teal-500/20",
      bgHover: "hover:bg-teal-500/10"
    },
    foodsToSuggest: [
      { name: "Brazil Nuts", benefit: "The richest dietary source of selenium, crucial for converting inactive T4 thyroid hormones to active T3." },
      { name: "Iodized Salt & Sea Kelp", benefit: "Provides iodine, the essential building block needed by the thyroid gland to construct hormones." },
      { name: "Eggs & Lean Proteins", benefit: "High in tyrosine and zinc, which play indispensable roles in thyroid secretion pathways." }
    ],
    foodsToAvoid: [
      { name: "Excessive Raw Cruciferous Veggies (Cabbage, Broccoli)", reason: "Contains goitrogens that block iodine absorption when consumed raw in large quantities." },
      { name: "Soy & Gluten Rich Foods", reason: "May interfere with thyroid hormone absorption and exacerbate autoimmune thyroid issues." }
    ],
    relaxationTechniques: [
      {
        title: "Thyroid Neck Extension Stretching",
        desc: "Improves local blood flow and lymphatic drainage around the thyroid gland.",
        steps: [
          "Sit upright with dropped shoulders",
          "Gently tilt your head backward, pointing your chin to the ceiling",
          "Hold for 10 seconds, feeling a gentle stretch in the throat",
          "Return slowly and repeat 3 times"
        ]
      },
      {
        title: "Thyroid-Soothing Ujjayi Pranayama",
        desc: "Creates a gentle vibrational massage in the throat that can calm local nerve endings.",
        steps: [
          "Inhale slowly through your nose",
          "Exhale slowly through your mouth while constricting the back of your throat",
          "Make a soft 'ocean wave' sound",
          "Perform for 8 breathing cycles"
        ]
      }
    ],
    dailyHabits: [
      { action: "Early Morning Pill Synchronization", category: "Endocrine Harmony", impact: "Take thyroid hormone on an empty stomach 60 minutes before breakfast with full water." },
      { action: "Basal Body Temperature Logging", category: "Metabolic Tracking", impact: "Monitors autonomic metabolic rates to help gauge dosage effectiveness." }
    ],
    clinicalSigns: [
      { symptom: "Extreme fatigue, rapid weight gain, and intense cold intolerance", urgency: "Dose Assessment", instruction: "Schedule a TSH / Free T3/T4 blood test with your endocrinologist." },
      { symptom: "Severe swelling in face, tongue, or lower limbs", urgency: "High Warning", instruction: "May signal severe hypothyroidism (myxedema). Seek professional consultation." }
    ],
    triviaTips: [
      "Thyroid Fact: Thyroid hormones control the basal metabolic rate of every single cell in your body, affecting temperature, heart rate, and brain function.",
      "Mineral Insight: Selenium and zinc are absolute co-factors; without them, the body cannot convert the storage form of thyroid hormone (T4) into the active form (T3)."
    ]
  },
  "General Care": {
    displayName: "General Wellness & Longevity Care",
    themeColor: {
      primary: "bg-emerald-600",
      text: "text-emerald-400",
      bg: "bg-emerald-950/20",
      border: "border-emerald-500/20",
      bgHover: "hover:bg-emerald-500/10"
    },
    foodsToSuggest: [
      { name: "Clean Mineral Water", benefit: "Transports key micro-elements and hydrates synovial joint complexes." },
      { name: "Broccoli & Cruiciferous Veggies", benefit: "Contains sulforaphanes which trigger biological cell defense enzymes." },
      { name: "Green Tea Infusions", benefit: "EGCG catechins stabilize mitochondrial activity and fight metabolic stressors." }
    ],
    foodsToAvoid: [
      { name: "Deep Fried Trans Fats", reason: "Deteriorates cell membrane fluidity and increases cellular inflammation." },
      { name: "High Fructose Syrups", reason: "Overloads liver enzymes leading to systemic metabolic dysregulation." }
    ],
    relaxationTechniques: [
      {
        title: "Posture Elevation & Un-shrugging",
        desc: "Simple physical resetting to clear neck tension lines and facilitate clean respiratory cycles.",
        steps: ["Roll shoulders backwards 3 times", "Stretch cervical spine looking upwards", "Inhale deeply tracking down tension"]
      }
    ],
    dailyHabits: [
      { action: "Consistent Sleeping Windows", category: "Biological Reset", impact: "Solidifies metabolic waste clearance in cerebral pathways." },
      { action: "Active Standing Reminders", category: "Spinal Health", impact: "Prevents muscular atrophy from long sitting hours." }
    ],
    clinicalSigns: [
      { symptom: "Unintended sudden body weight fluctuations", urgency: "Moderate", instruction: "Inform family doctor during routine checkups to assess hormonal baselines." }
    ],
    triviaTips: [
      "Longevity Factor: Staying adequately hydrated has been consistently associated with lower risks for chronic metabolic and muscular illnesses.",
      "Movement is Medicine: Non-exercise activity thermogenesis (NEAT) such as standing, pacing, or cleaning burns more cumulative energy than brief weekly workouts."
    ]
  }
};

export default function ConditionInsight({ user }: ConditionInsightProps) {
  // Extract user's medical conditions, fallback if empty
  const activeConditions = user.primaryConditions.filter(c => INSIGHTS_DB[c]) || [];
  const defaultCondition = activeConditions.length > 0 ? activeConditions[0] : "General Care";

  const [selectedCondition, setSelectedCondition] = useState<string>(defaultCondition);
  const [activeTab, setActiveTab] = useState<'diet' | 'relax' | 'habits' | 'alert'>('diet');
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>({});
  const [isRotating, setIsRotating] = useState(false);

  // If user condition selection is updated on settings, update state
  React.useEffect(() => {
    if (activeConditions.length > 0 && !activeConditions.includes(selectedCondition)) {
      setSelectedCondition(activeConditions[0]);
    }
  }, [user.primaryConditions]);

  const currentData = INSIGHTS_DB[selectedCondition] || INSIGHTS_DB["General Care"];

  const handleRotateTrivia = () => {
    setIsRotating(true);
    setTimeout(() => {
      setTriviaIndex((prev) => (prev + 1) % currentData.triviaTips.length);
      setIsRotating(false);
    }, 300);
  };

  const toggleHabit = (habitAction: string) => {
    setCompletedHabits(prev => ({
      ...prev,
      [habitAction]: !prev[habitAction]
    }));
  };

  const getTabIcon = (tab: typeof activeTab) => {
    switch (tab) {
      case 'diet': return <Salad className="h-4 w-4" />;
      case 'relax': return <Wind className="h-4 w-4" />;
      case 'habits': return <Activity className="h-4 w-4" />;
      case 'alert': return <ShieldAlert className="h-4 w-4" />;
    }
  };

  // Safe list of conditions
  const conditionsList = activeConditions.length > 0 ? activeConditions : ["General Care"];

  return (
    <div id="condition-insights-hub" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800/40">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 animate-pulse text-indigo-400" />
            Adaptive Condition Guidance
          </span>
          <h3 className="text-lg font-display font-semibold text-white">Daily Condition Insights</h3>
          <p className="text-xs text-slate-400 mt-0.5">Dynamically tuned to your medical profiles</p>
        </div>

        {/* Condition Selector Tabs */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {conditionsList.map((cond) => {
            const data = INSIGHTS_DB[cond] || INSIGHTS_DB["General Care"];
            const isSelected = selectedCondition === cond;
            return (
              <button
                key={cond}
                onClick={() => {
                  setSelectedCondition(cond);
                  setTriviaIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? `${data.themeColor.primary} text-white font-bold shadow-md`
                    : `bg-slate-950 text-slate-400 hover:text-white border border-slate-800`
                }`}
              >
                {cond === 'Diabetes' && <Scale className="h-3.5 w-3.5" />}
                {cond === 'Depression' && <Brain className="h-3.5 w-3.5" />}
                {cond === 'Hypertension' && <Activity className="h-3.5 w-3.5" />}
                {cond === 'General Care' && <Leaf className="h-3.5 w-3.5" />}
                <span>{data.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Quick Mini Trivia Slider */}
      <div className={`p-4 rounded-2xl border ${currentData.themeColor.border} ${currentData.themeColor.bg} flex items-start gap-3 relative overflow-hidden backdrop-blur-md`}>
        <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0">
          <Compass className={`h-4.5 w-4.5 ${currentData.themeColor.text}`} />
        </div>
        <div className="space-y-1.5 pr-8">
          <span className="text-[9px] font-mono uppercase tracking-widest font-black text-slate-500 block">Proactive Tip of the Day</span>
          <AnimatePresence mode="wait">
            <motion.p
              key={triviaIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-slate-300 leading-relaxed font-sans"
            >
              {currentData.triviaTips[triviaIndex] || "Your daily custom treatment protocols are fully synchronized. Stay close to healthy baselines."}
            </motion.p>
          </AnimatePresence>
        </div>
        <button
          onClick={handleRotateTrivia}
          disabled={isRotating}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer"
          title="Shuffle next insight"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Structured Category Tab Selector */}
      <div className="grid grid-cols-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60">
        {(['diet', 'relax', 'habits', 'alert'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          const label = tab === 'diet' ? 'Optimal Diet' : tab === 'relax' ? 'Stress Relief' : tab === 'habits' ? 'Habits Lab' : 'Warnings';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-[10px] sm:text-xs font-semibold rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                isSelected 
                  ? 'bg-slate-900 border border-slate-800 font-bold text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={isSelected ? currentData.themeColor.text : 'text-slate-400'}>
                {getTabIcon(tab)}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="min-h-56">
        <AnimatePresence mode="wait">
          {activeTab === 'diet' && (
            <motion.div
              key="diet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* Suggetions */}
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/40 pb-2">
                  <Salad className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Advocated Foods</span>
                </div>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {currentData.foodsToSuggest.map((food, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span>{food.name}</span>
                      </p>
                      <p className="text-[11px] text-slate-450 leading-relaxed pl-3">{food.benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoids */}
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/40 pb-2">
                  <Leaf className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Restrict &amp; Avoid</span>
                </div>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {currentData.foodsToAvoid.map((food, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block" />
                        <span>{food.name}</span>
                      </p>
                      <p className="text-[11px] text-slate-450 leading-relaxed pl-3">{food.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'relax' && (
            <motion.div
              key="relax"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                {currentData.relaxationTechniques.map((tech, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Wind className="h-4 w-4 text-sky-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{tech.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{tech.desc}</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 space-y-1.5">
                      <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Execution Plan:</span>
                      <ul className="space-y-1">
                        {tech.steps.map((st, sIdx) => (
                          <li key={sIdx} className="text-[10px] text-slate-300 flex items-start gap-1 leading-relaxed">
                            <span className="font-mono text-indigo-400 font-bold shrink-0">{sIdx + 1}.</span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 md:p-5">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Today's Bio-Habit Checklist</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Interactive Track</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {currentData.dailyHabits.map((hb, i) => {
                    const isDone = completedHabits[hb.action] || false;
                    return (
                      <div 
                        key={i} 
                        onClick={() => toggleHabit(hb.action)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-40 group select-none ${
                          isDone 
                            ? 'bg-indigo-950/20 border-indigo-505/30 shadow-inner' 
                            : 'bg-slate-900/60 border-slate-850 hover:border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded-full ${isDone ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
                              {hb.category}
                            </span>
                            <div className={`h-4.5 w-4.5 rounded-full border transition flex items-center justify-center shrink-0 ${
                              isDone 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'border-slate-700 group-hover:border-slate-500 text-transparent'
                            }`}>
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          </div>
                          <p className={`text-xs font-semibold leading-snug transition-all ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                            {hb.action}
                          </p>
                        </div>

                        <div className="border-t border-slate-800/40 pt-2.5 mt-2">
                          <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold block">Biometric Benefit:</span>
                          <p className="text-[10px] text-slate-400 truncate group-hover:whitespace-normal group-hover:h-auto transition-all">{hb.impact}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'alert' && (
            <motion.div
              key="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800/40 pb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Clinical Warning Thresholds</span>
                </div>

                <div className="space-y-3.5">
                  {currentData.clinicalSigns.map((cl, i) => (
                    <div key={i} className="flex gap-3 p-3.5 rounded-2xl bg-slate-900 border border-rose-900/10 hover:border-rose-900/20 transition">
                      <div className="p-1 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 h-fit text-[10px] font-bold uppercase tracking-widest shrink-0 font-mono">
                        {cl.urgency}
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-slate-200">{cl.symptom}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed"><strong className="text-rose-400/80">Instruction:</strong> {cl.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-850 pt-3 text-[10px] text-amber-500/80 bg-amber-500/5 p-3 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Disclaimer:</strong> This dashboard renders heuristic dynamic wellness insights based on general clinical literature. It is not an alternative to licensed clinical care. In case of real physical medical emergencies, immediately contact emergency responders.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
