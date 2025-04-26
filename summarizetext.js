const { GoogleGenerativeAI } = require("@google/generative-ai")
const dotenv = require("dotenv");

dotenv.config();
// models/gemini-2.0-flash
const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function summarizeText(text) {
    const model =
        genAi.getGenerativeModel({
            model: "models/gemini-2.0-flash"
        });
    const prompt = `Summarize the pdf text in short words ${text}`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // console.log(response.text());
    return response.text();
}

// summarizeText("Heavy industries like manufacturing, mining, and construction are witnessing a new era of automation driven by IoT, robotics, and machine learning.Automation not only increases operational eficiency but also ensures worker safety,predictive maintenance, and sustainability. Smart factories are now becoming the norm, utilizing real-time data for operational excellence.");

module.exports = summarizeText;