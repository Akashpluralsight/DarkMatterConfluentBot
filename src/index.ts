import { loadQARefineChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import express from "express"
import cors from "cors"
import dotenv from "dotenv";
dotenv.config();

const app = express()


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const filePath = 'docs';

const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPEN_AI_API_KEY });
const model = new OpenAI({ temperature: 0, openAIApiKey: process.env.OPEN_AI_API_KEY ,cache:true });
const chain = loadQARefineChain(model);
const loader = new TextLoader("./darkmatters.pdf");
let store: any = undefined;
const port=process.env.APIPORT

const init_document_loader = async () => {

    const directoryLoader = new DirectoryLoader(filePath, {
        '.pdf': (path) => new PDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });


    const docs = await textSplitter.splitDocuments(rawDocs);
    store = await MemoryVectorStore.fromDocuments(docs, embeddings);
}

if (store == undefined) {
    init_document_loader()
}

// Load the documents and create the vector store


// Create an interface to read from the command line


app.post("/getResponse", async (req, res) => {

    try {

        const { question,sessionId } = req.body;

        if (store == undefined) {
            console.log("This is a bug store should have been called way before")
            await init_document_loader()
        }

        const relevantDocs = await store.similaritySearch(question);

        // // Call the chain
        const response = await chain.call({
            input_documents: relevantDocs,
            question
        });

        console.log(response, "logging the response")

        res.status(201).send({ data: response,sessionId })
    }
    catch (e: any) {
        console.log(e.message)
        res.status(400).send({ errorMessage: e.message })
    }


})


app.listen(port, () => {
    console.log(`server started at port ${port}`)
})

//output_text