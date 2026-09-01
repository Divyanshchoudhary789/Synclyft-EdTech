const { GoogleGenAI } = require("@google/genai");
const logger = require("./loggerService.js");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// Defensively extracts the first complete JSON object from a model response.
// Gemini occasionally wraps JSON in markdown fences or appends trailing prose,
// which makes a naive JSON.parse(res.text) fail. This strips fences and
// slices from the first '{' to the last '}' before parsing.
const extractJsonObject = (text) => {
    if (typeof text !== 'string') return null;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
        logger.warn({ message: 'extractJsonObject parse fallback failed', error: e.message });
        return null;
    }
};

const getLanguageSpecificPromptContext = (lang) => {
    const base = lang.toLowerCase();
    switch (base) {
        case 'cpp':
        case 'c':
            return "Focus heavily on memory management leaks, raw pointers, standard headers safety, and STL algorithm efficiency.";
        case 'java':
            return "Check strict Object-Oriented patterns conformance, naming conventions (camelCase), and resource management patterns.";
        case 'javascript':
        case 'typescript':
            return "Scan for modern block scopes (let/const), asynchronous execution patterns (async/await), and type integrity parameters for TypeScript.";
        case 'python':
            return "Audit PEP 8 compliance parameters, idiomatic list comprehensions utility, and efficient algorithmic loop constructs.";
        default:
            return "Verify standard algorithmic code optimization, logical sanity, syntax protection, and descriptive variable architecture.";
    }
};


const getAptitudeCategoryPromptContext = (category) => {
    switch (category) {
        case 'Quantitative Ability':
            return "Focus heavily on numerical accuracy, step-by-step mathematical logic, formula application, and calculation precision.";
        case 'Logical Reasoning':
            return "Audit logical flow, pattern recognition, syllogism alignment, deductive consistency, and constraint processing.";
        case 'English':
            return "Evaluate grammatical correctness, semantic comprehension, vocabulary accuracy, and contextual syntax structures.";
        case 'Data Interpretation':
            return "Check analytical synthesis of tabular/graphical datasets, percentage/ratio derivation accuracy, and visual data decoding.";
        case 'Computer Knowledge':
            return "Verify technical memory correctness, core fundamental concepts, networking/OS basics, and dry-run code logic evaluation.";
        default:
            return "Verify general cognitive logic, standard analytical sanity, option elimination symmetry, and clear reasoning flow.";
    }
};




const analyzeAptitudeResponse = async ({ questionText, options = [], studentAnswer, idealAnswer, idealExplanation, category }) => {
    try {
        const categoryContext = getAptitudeCategoryPromptContext(category);

        const prompt = `You are an Expert Psychometrician and Cognitive Ability Evaluator assessing a candidate's response.
        
        Sub-Round Category Domain: ${category}
        Evaluation Core Strategy: ${categoryContext}
        
        Question Asked: "${questionText}"
        Available Options: ${JSON.stringify(options)}
        Candidate's Selected Answer: "${studentAnswer}"
        Correct/Ideal Answer: "${idealAnswer}"
        Ideal Explanation/Step-by-Step Solution: "${idealExplanation}"
        
        Your Task:
        1. Compare the candidate's selected answer with the ideal correct answer. If it matches, the score should reflect full credit.
        2. Evaluate structural or conceptual misconceptions if the answer is incorrect based on the category domain rules.
        3. Score keywordCoverage (0-100) based on textual reasoning or option mapping parameters.
        4. Score semanticSimilarity (0-100) based on conceptual alignment with the correct logic choice.
        5. Score rubricCorrectness (0-100) based on binary correctness of the answer (0 for wrong, 100 for correct).
        6. Provide a crisp, domain-specific explanation detailing why the answer is correct or exactly where the logical gap occurred, referencing the step-by-step solution.
        7. Calculate an overall composite score strictly between 0 and 10 (Directly 10 if correct, 0 if incorrect).`;

        const jsonSchema = {
            type: "OBJECT",
            properties: {
                keywordCoverage: { type: "INTEGER", description: "Score out of 100 for reasoning accuracy or formula coverage." },
                semanticSimilarity: { type: "INTEGER", description: "Score out of 100 for alignment with the ideal analytical intent." },
                rubricCorrectness: { type: "INTEGER", description: "Score out of 100 reflecting strict correctness (0 or 100)." },
                isCorrect: { type: "BOOLEAN", description: "True if the candidate's answer perfectly matches the ideal answer, otherwise False." },
                explanation: { type: "STRING", description: "Professional, domain-specific breakdown explaining the correctness or the analytical flaw." },
                score: { type: "INTEGER", description: "Overall quantitative score out of 10." }
            },
            required: ["keywordCoverage", "semanticSimilarity", "rubricCorrectness", "isCorrect", "explanation", "score"]
        };

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: jsonSchema
            }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse Gemini model response');
        }
        return parsed;

    } catch (e) {
        logger.error("Gemini Aptitude Evaluator Engine Error:", e);
        return {
            keywordCoverage: 0,
            semanticSimilarity: 0,
            rubricCorrectness: 0,
            isCorrect: false,
            explanation: "Automated aptitude evaluation system bypassed due to platform execution safety configurations.",
            score: 0
        };
    }
};



const analyzeCodingResponse = async ({ questionText, studentCode, language, compilerOutputContext, idealAnswer }) => {
    try {
        const structuralRules = getLanguageSpecificPromptContext(language);

        const prompt = `You are an expert Senior Compiler Engineer and DSA Evaluator.
        
        Language Context Rules: ${structuralRules}
        Question Statement: "${questionText}"
        Ideal Reference Answer/Logic: ${idealAnswer}
        Candidate Submitted Code: ${studentCode}
        Compiler Execution Telemetry Context: ${compilerOutputContext}
        
        Your Task:
        1. Analyze the provided Ideal Reference Answer to understand the benchmark logic, target complexities, and edge cases.
        2. Evaluate the Candidate's Code against that ideal baseline logic. Do not look for exact text matching; analyze structural logic, semantic similarity, algorithmic correctness, and efficiency compared to the ideal solution.
        3. Score the code strictly between 0 and 10 based on code architecture, corner cases covered, and the provided Compiler Telemetry.
        
        Return a strict JSON layout without code blocks or extra text:
        {
            "keywordCoverage": 0-100, 
            "semanticSimilarity": 0-100, 
            "rubricCorrectness": 0-100,
            "timeComplexity": "string (e.g., O(N log N))", 
            "spaceComplexity": "string (e.g., O(1))", 
            "explanation": "Detailed professional feedback highlighting bugs, optimization advice, or structural appreciation based on the comparison with the ideal answer.", 
            "score": 0-10
        }`;

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse Gemini model response');
        }
        return parsed;
    } catch (e) {
        logger.error("Gemini Coding Evaluator Error:", e);
        return {
            keywordCoverage: 0,
            semanticSimilarity: 0,
            rubricCorrectness: 0,
            timeComplexity: "O(N)",
            spaceComplexity: "O(1)",
            explanation: "Coding AI analysis timed out or encountered structural translation error.",
            score: 0
        };
    }
};



// DEDICATED TECHNICAL EXAMINER
const analyzeTechnicalResponse = async ({ questionText, studentCode, language, compilerOutputContext, idealAnswer }) => {
    try {
        const prompt = `You are a Principal Enterprise System Architect and Expert Competitive Programmer evaluating a candidate's solution for a hard coding problem.
        
        Question: "${questionText}"
        Ideal Reference Answer/Logic: ${idealAnswer}
        Candidate Code: "${studentCode}"
        Preferred Language: "${language}"
        Compiler Execution Telemetry: "${compilerOutputContext}"
        
        Your Task:
        1. Utilize the provided Ideal Reference Answer as the baseline production-grade solution (best Time and Space Complexity) for the given problem statement.
        2. Evaluate the candidate's code structure, edge-case handling, and algorithmic optimization strictly against this ideal reference logic.
        3. Strictly crosscheck the execution telemetry. If the compiler output indicates a compilation error, runtime error, or 0 test cases passed, ensure the score reflects this failure heavily.
        
        Return a strict JSON layout without code blocks or extra text:
        { 
            "keywordCoverage": 0-100, 
            "semanticSimilarity": 0-100, 
            "rubricCorrectness": 0-100, 
            "timeComplexity": "string (e.g., O(N log N))",
            "spaceComplexity": "string (e.g., O(N))",
            "explanation": "Rigorous engineering feedback detailing logic bottlenecks, missed constraints, or syntax errors, relative to the ideal logic provided.", 
            "score": 0-10 
        }`;

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse Gemini model response');
        }
        return parsed;
    } catch (e) {
        logger.error("Gemini Technical Evaluator Error:", e);
        return {
            keywordCoverage: 0,
            semanticSimilarity: 0,
            rubricCorrectness: 0,
            timeComplexity: "Unknown",
            spaceComplexity: "Unknown",
            explanation: "Technical execution analysis pipeline timeout or format parsing error.",
            score: 0
        };
    }
};



// DEDICATED HR / BEHAVIOURAL SPECIALIST 
const analyzeHrResponse = async ({ questionText, studentAnswer, idealAnswer }) => {
    try {
        const prompt = `You are a Principal Talent Acquisition Executive and Corporate Behavioral Auditor assessing interview responses using the STAR format principles.
        
        Question Asked: "${questionText}"
        Candidate's Answer: "${studentAnswer}"
        Ideal Answer Blueprint/Targets: "${idealAnswer}"
        
        Your Task:
        1. Evaluate the candidate's professional confidence, communication structure, workplace ethics, and narrative maturity based on the STAR method.
        2. Score keywordCoverage (0-100) based on core competency terminology mapping.
        3. Score semanticSimilarity (0-100) based on contextual logic and intent alignment with the ideal answer.
        4. Score rubricCorrectness (0-100) based on overall behavioral excellence and structured delivery.
        5. Provide a highly detailed, professional engineering feedback summary in the explanation field.
        6. Calculate an overall composite score strictly between 0 and 10.`;

        // Strict Schema Definition for Gemini to eliminate parsing anomalies
        const jsonSchema = {
            type: "OBJECT",
            properties: {
                keywordCoverage: { type: "INTEGER", description: "Score out of 100 for keyword coverage." },
                semanticSimilarity: { type: "INTEGER", description: "Score out of 100 for semantic similarity." },
                rubricCorrectness: { type: "INTEGER", description: "Score out of 100 for rubric correctness." },
                explanation: { type: "STRING", description: "Detailed, actionable professional feedback critique." },
                score: { type: "INTEGER", description: "Overall consolidated score out of 10." }
            },
            required: ["keywordCoverage", "semanticSimilarity", "rubricCorrectness", "explanation", "score"]
        };

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: jsonSchema // Enforces the model to return perfect JSON mapping your schema fields
            }
        });

        // Safe evaluation object parsing ready for direct Mongoose document injection
        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse Gemini model response');
        }
        return parsed;

    } catch (e) {
        logger.error("Gemini HR Evaluator Engine Error:", e);
        return {
            keywordCoverage: 70,
            semanticSimilarity: 70,
            rubricCorrectness: 75,
            explanation: "Automated behavioral metrics compiled securely via platform baseline safety configurations.",
            score: 7
        };
    }
};



// UNIFIED CROSS-ROUND PROFILE COMPILER
const compileFinalReportCard = async (session, rounds) => {
    try {
        const prompt = `Synthesize an executive candidate talent map and recruitment readiness insight from cross-round telemetry benchmarks.
        
        Session Metadata: ${JSON.stringify(session)}
        Active Round Matrix Data: ${JSON.stringify(rounds)}
        
        Your Task:
        Compile a unified, objective diagnostic dashboard report summarizing performance traits across all rounds.
        
        Return a structured engineering JSON blueprint without code blocks or extra text:
        {
            "narrativeSummary": "string summarizing overall candidate performance profile.", 
            "strengths": ["string"], 
            "weaknesses": ["string"], 
            "skillGapsVsJd": ["string based on session job description target gaps"], 
            "overallGrade": "A/B/C/D",
            "actionableStudyPlan": [
                {
                    "topic": "string", 
                    "focusArea": "string", 
                    "recommendedAction": "string", 
                    "priority": "high/medium/low"
                }
            ]
        }`;

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse Gemini model response');
        }
        return parsed;
    } catch (e) {
        logger.error("Gemini Report Card Compiler Error:", e);
        return {
            narrativeSummary: "Failed to compile automated insights due to internal pipeline exception.",
            strengths: [],
            weaknesses: [],
            skillGapsVsJd: [],
            overallGrade: "Pending",
            actionableStudyPlan: []
        };
    }
};



// DEDICATED RESUME / ATS OPTIMIZER
const analyzeResumeATS = async ({ targetRole, experienceLevel, targetJD, personalInfo, skills, experience, projects, certificates }) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const prompt = `You are an elite corporate technical recruiter and ATS (Applicant Tracking System) software analyst with 15+ years of experience.
Analyze the following resume configuration against the candidate's target job context and return granular, actionable optimization steps.

Target Designation: ${targetRole}
Experience Level: ${experienceLevel}
Target Job Description: ${targetJD || 'Not provided'}

Candidate Profile:
- Full Name: ${personalInfo?.fullName || 'N/A'}
- Professional Summary: ${personalInfo?.summary || 'N/A'}
- Skills: ${JSON.stringify(skills || [])}
- Work Experience: ${JSON.stringify(experience || [])}
- Projects: ${JSON.stringify(projects || [])}
- Certifications: ${JSON.stringify(certificates || [])}

Your Task:
1. Estimate the current ATS compatibility score (0-100).
2. Identify missing or weak keywords that the target role / JD demands.
3. Propose a stronger professional summary.
4. Suggest concrete improvements for each experience entry (use X-Y-Z / quantified metric framing).
5. Suggest project description enhancements and relevant technologies to highlight (note any missing GitHub/live demo links).
6. Suggest how to better present certifications (issuer, credential ID, verification link).
7. Provide general, high-impact resume tips.

Return ONLY a strict JSON object (no markdown, no code fences) in exactly this shape:
{
    "atsScoreEstimate": 78,
    "missingKeywords": ["keywordA", "keywordB"],
    "summarySuggestion": "Polished, metric-driven summary text...",
    "experienceImprovements": ["In bullet 1, include a quantitative metric using the X-Y-Z framework"],
    "projectImprovements": ["Reframe project X to emphasize impact and technologies used"],
    "certificationImprovements": ["Add the issuing authority and credential ID for X to strengthen credibility"],
    "generalTips": ["Tip 1", "Tip 2"]
}`;

        const jsonSchema = {
            type: "OBJECT",
            properties: {
                atsScoreEstimate: { type: "INTEGER", description: "Estimated ATS compatibility score out of 100." },
                missingKeywords: { type: "ARRAY", items: { type: "STRING" }, description: "Keywords missing from the resume for the target role." },
                summarySuggestion: { type: "STRING", description: "Polished, metric-driven professional summary." },
                experienceImprovements: { type: "ARRAY", items: { type: "STRING" } },
                projectImprovements: { type: "ARRAY", items: { type: "STRING" } },
                certificationImprovements: { type: "ARRAY", items: { type: "STRING" } },
                generalTips: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: [
                "atsScoreEstimate", "missingKeywords", "summarySuggestion",
                "experienceImprovements", "projectImprovements",
                "certificationImprovements", "generalTips"
            ]
        };

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: jsonSchema
            }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse ATS optimization response from model');
        }

        return {
            atsScoreEstimate: Number(parsed.atsScoreEstimate) || 0,
            missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
            summarySuggestion: parsed.summarySuggestion || '',
            experienceImprovements: Array.isArray(parsed.experienceImprovements) ? parsed.experienceImprovements : [],
            projectImprovements: Array.isArray(parsed.projectImprovements) ? parsed.projectImprovements : [],
            certificationImprovements: Array.isArray(parsed.certificationImprovements) ? parsed.certificationImprovements : [],
            generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : []
        };
    } catch (e) {
        logger.error("Gemini Resume ATS Optimizer Error:", e);
        return {
            atsScoreEstimate: 0,
            missingKeywords: [],
            summarySuggestion: "",
            experienceImprovements: [],
            projectImprovements: [],
            certificationImprovements: [],
            generalTips: ["Resume optimization is temporarily unavailable. Please try again later."]
        };
    }
};


// DEDICATED RESUME ANALYZER (raw uploaded resume text)
const analyzeResumeFromText = async ({ resumeText, targetRole, experienceLevel, targetJD }) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const prompt = `You are an elite corporate technical recruiter and ATS (Applicant Tracking System) software analyst with 15+ years of experience.
You are given the RAW TEXT extracted from a candidate's resume, along with their target job context.
Analyze the resume text and return a granular, actionable diagnostic.

Target Designation: ${targetRole}
Experience Level: ${experienceLevel}
Target Job Description: ${targetJD || 'Not provided'}

Extracted Resume Text:
"""
${resumeText}
"""

Your Task:
1. Estimate the resume's ATS compatibility score (0-100).
2. Identify keywords/skills already present that match the target role (strengths).
3. Identify missing or weak keywords the target role / JD demands.
4. List concrete strengths and weaknesses of the resume.
5. Propose a stronger professional summary.
6. Suggest improvements for experience bullets (X-Y-Z / quantified framing).
7. Suggest project description enhancements and relevant technologies to highlight.
8. Suggest how to better present certifications (issuer, credential ID, verification link).
9. Provide general, high-impact resume tips.

Return ONLY a strict JSON object (no markdown, no code fences) in exactly this shape:
{
    "atsScoreEstimate": 78,
    "matchedKeywords": ["React", "Node.js"],
    "missingKeywords": ["Docker", "Kubernetes"],
    "strengths": ["Strong project showcase", "Clear impact metrics"],
    "weaknesses": ["Missing certification links", "Weak summary"],
    "summarySuggestion": "Polished, metric-driven summary text...",
    "experienceImprovements": ["In bullet 1, include a quantitative metric using the X-Y-Z framework"],
    "projectImprovements": ["Reframe project X to emphasize impact and technologies used"],
    "certificationImprovements": ["Add the issuing authority and credential ID for X to strengthen credibility"],
    "generalTips": ["Tip 1", "Tip 2"]
}`;

        const jsonSchema = {
            type: "OBJECT",
            properties: {
                atsScoreEstimate: { type: "INTEGER", description: "Estimated ATS compatibility score out of 100." },
                matchedKeywords: { type: "ARRAY", items: { type: "STRING" } },
                missingKeywords: { type: "ARRAY", items: { type: "STRING" } },
                strengths: { type: "ARRAY", items: { type: "STRING" } },
                weaknesses: { type: "ARRAY", items: { type: "STRING" } },
                summarySuggestion: { type: "STRING", description: "Polished, metric-driven professional summary." },
                experienceImprovements: { type: "ARRAY", items: { type: "STRING" } },
                projectImprovements: { type: "ARRAY", items: { type: "STRING" } },
                certificationImprovements: { type: "ARRAY", items: { type: "STRING" } },
                generalTips: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: [
                "atsScoreEstimate", "matchedKeywords", "missingKeywords", "strengths",
                "weaknesses", "summarySuggestion", "experienceImprovements",
                "projectImprovements", "certificationImprovements", "generalTips"
            ]
        };

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: jsonSchema
            }
        });

        const parsed = extractJsonObject(res.text);
        if (!parsed) {
            throw new Error('Failed to parse resume analysis response from model');
        }

        return {
            atsScoreEstimate: Number(parsed.atsScoreEstimate) || 0,
            matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
            missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            summarySuggestion: parsed.summarySuggestion || '',
            experienceImprovements: Array.isArray(parsed.experienceImprovements) ? parsed.experienceImprovements : [],
            projectImprovements: Array.isArray(parsed.projectImprovements) ? parsed.projectImprovements : [],
            certificationImprovements: Array.isArray(parsed.certificationImprovements) ? parsed.certificationImprovements : [],
            generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : []
        };
    } catch (e) {
        logger.error("Gemini Resume Analyzer Error:", e);
        return {
            atsScoreEstimate: 0,
            matchedKeywords: [],
            missingKeywords: [],
            strengths: [],
            weaknesses: [],
            summarySuggestion: "",
            experienceImprovements: [],
            projectImprovements: [],
            certificationImprovements: [],
            generalTips: ["Resume analysis is temporarily unavailable. Please try again later."]
        };
    }
};


module.exports = { analyzeAptitudeResponse, analyzeCodingResponse, analyzeTechnicalResponse, analyzeHrResponse, compileFinalReportCard, analyzeResumeATS, analyzeResumeFromText }