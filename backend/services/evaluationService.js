const axios = require("axios");

const RoundDetail = require("../models/RoundDetailModel.js");
const logger = require("./loggerService.js");

const LANG_MAP = {
    'cpp': 54, 'c': 50, 'javascript': 63, 'typescript': 74,
    'python': 71, 'java': 62, 'csharp': 51, 'go': 60,
    'ruby': 72, 'php': 68, 'rust': 73, 'swift': 83,
    'kotlin': 78, 'scala': 81, 'sql': 82
};

const JUDGE0_BATCH_LIMIT = 20;

const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Self-hosted Judge0 behind auth (see judge0.conf AUTHN_TOKEN). Optional — an
// unauthenticated instance simply ignores the header.
const judge0Headers = () => {
    const h = { 'Content-Type': 'application/json' };
    if (process.env.JUDGE0_AUTH_TOKEN) h['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
    return h;
};

const executeCodeOnJudge0 = async (code, language, testCases) => {
    try {
        if (!testCases || testCases.length === 0) {
            throw new Error("No test cases provided for evaluation.");
        }

        const codeString = typeof code === 'string' ? code : (code ? JSON.stringify(code) : "");
        const langKey = typeof language === 'string' ? language.toLowerCase() : String(language || "").toLowerCase();
        const languageId = LANG_MAP[langKey] || 63;

        const chunks = chunkArray(testCases, JUDGE0_BATCH_LIMIT);
        const allOutputs = [];

        for (const chunk of chunks) {
            const payloads = chunk.map(tc => ({
                source_code: Buffer.from(codeString).toString('base64'),
                language_id: languageId,
                stdin: Buffer.from(typeof tc?.input === 'string' ? tc.input : JSON.stringify(tc?.input || "")).toString('base64'),
                expected_output: Buffer.from(typeof tc?.expectedOutput === 'string' ? tc.expectedOutput : JSON.stringify(tc?.expectedOutput || "")).toString('base64')
            }));

            const batchRes = await axios.post(`${process.env.JUDGE0_URL}/submissions/batch?base64_encoded=true`, { submissions: payloads }, {
                headers: judge0Headers(),
                timeout: 15000
            });

            const tokens = (batchRes.data.submissions || batchRes.data).map(item => item.token);

            let outputs = [];
            let completed = false;
            let intervals = 0;

            while (!completed && intervals < 10) {
                await sleep(1500);
                const poll = await axios.get(`${process.env.JUDGE0_URL}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true`, { headers: judge0Headers(), timeout: 15000 });
                outputs = poll.data.submissions || poll.data;

                const isPending = outputs.some(exec => exec.status_id === 1 || exec.status_id === 2);
                if (!isPending) completed = true;
                intervals++;
            }

            allOutputs.push(...outputs);
        }

        return allOutputs;
    } catch (error) {
        logger.error("Judge0 Engine Call Defect:", error.message, error.stack);
        throw new Error(`Sandbox compiler pipeline failed: ${error.message}`);
    }
};

module.exports = executeCodeOnJudge0;
