const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const cors = require("cors");
const app = express();

// cors for security
const corsOptions = {
    origin: "*",
    methods: ['GET', "POST"],
    allowedHeaders: ['Content-type', 'Authorization']
};

app.use(cors(corsOptions));
const pdf = require("pdf-parse")
const summarizeText = require("./summarizetext")
dotenv.config();


// To store pdf in the uploads folder and give it original name
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },

});

const upload = multer({ storage: storage });

// to connect mongoose atlas
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("mongoose connected");
    })
    .catch((e) => {
        console.error(e);
    });

//for checking
app.get("/", (req, res) => {
    res.send("working");
});

//upload schema
const uploadSchema = new mongoose.Schema({
    batch_id: {
        type: String
    },
    files: [{
        filename: {
            type: String
        },
        path: {
            type: String
        },
    }],
    status: {
        type: String
    }
})
const Upload = mongoose.model('Upload', uploadSchema)

//route to check the status of batch
app.get("/batch/:batch_id/status", async (req, res) => {
    try {
        const { batch_id } = req.params;
        const batch = await Upload.findOne({ batch_id });
        if (!batch) {
            return res.send('batch not found');
        }
        res.json({
            status: batch.status
        })

    }
    catch (e) {
        console.error(e);
        res.send('something went wrong');
    }

});

//route to get the individual and combined insights
app.get("/batch/:batch_id/summary", async (req, res) => {
    console.log("summary")
    try {
        const { batch_id } = req.params;
        const batch = await
            Upload.findOne({ batch_id });
        if (!batch) {
            return res.send('batch not found');
        }
        const pdfFiles = batch.files.filter(file => (
            (file.filename.endsWith('.pdf'))
        ))
        console.log(pdfFiles);
        let combinedSummary = '';
        let summaries = [];
        for (const pdfFile of pdfFiles) {
            const databuffer = fs.readFileSync(pdfFile.path);
            const data = await pdf(databuffer)
            // console.log(data.text);
            // console.log(pdfFile);
            const summary = await summarizeText(data.text)
            summaries.push({
                filename: pdfFile.filename,
                summary: summary
            });
            combinedSummary += `${summary}\n`;
        }

        batch.status = 'processed';
        await batch.save();
        res.json({
            batch_id: batch.batch_id,
            status: batch.status,
            summaries: summaries,
            FinalInsights: combinedSummary
        })
    }
    catch (e) {
        console.error(e);
        res.send('something went wrong');
    }
});

// route to upload pdf in uploads folder and also save the metadata to db
app.post("/upload-batch", upload.array("files", 5), async (req, res) => {
    console.log(req.files);
    try {
        const uploadedFiles = req.files;
        if (uploadedFiles.length < 3 || uploadedFiles.length > 5) {
            return res.send("3-5 files required");
        }
        const filesData = req.files.map(file => ({
            filename: file.filename,
            path: file.path
        }))
        const newUpload = new Upload({
            batch_id: 'batch_' + Date.now(),
            files: filesData,
            status: 'processing'
        })
        await newUpload.save();
        res.json({
            batch_id: 'batch_' + Date.now(),
            files: filesData,
            status: 'processing'
        });
    }
    catch {
        res.send("something went wrong")
    }
});

//running on port 5000
app.listen(process.env.PORT || 5000, () => {
    console.log("server started");
});
