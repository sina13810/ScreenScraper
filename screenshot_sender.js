import puppeteer from "puppeteer";
import amqp from "amqplib/callback_api.js";
import fs from "fs";
// import axios from "axios";
// import axiosRetry from "axios-retry";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

//*  keeps the connections alive between the requests, and aviods of establishing new connections.
// const agent = new http.Agent({ keepAlive: true });

// axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// const axiosInstance = axios.create({ httpAgent: agent });

const app = express();
const port = process.env.PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let rabbitConnection;

function startRabbitConnection() {
    if (rabbitConnection) {
        return Promise.resolve(rabbitConnection);
    }
    return new Promise((resolve, reject) => {
        amqp.connect(
            `amqp://${process.env.RABBIT_USERNAME}:${process.env.PASSWORD}@144.217.65.234:5672/`,
            (error, connection) => {
                if (error) {
                    reject(error);
                    return;
                }
                rabbitConnection = connection;
                // Handle connection close and errors appropriately
                rabbitConnection.on("error", (err) => {
                    console.error("RabbitMQ connection error:", err);
                    rabbitConnection = null; // Reset connection on error
                });
                rabbitConnection.on("close", () => {
                    console.log("RabbitMQ connection closed");
                    rabbitConnection = null; // Reset connection on close
                });
                resolve(connection);
            }
        );
    });
}
let sendToQueue;

app.post("/screenshot", async (req, res) => {
    if (req.body) {
        if (req.body.given_url.length > 0) {
            try {
                if (!rabbitConnection) {
                    console.log("Connecting to RabbitMQ");
                    await startRabbitConnection();
                }
                rabbitConnection.createChannel(function (error1, channel) {
                    if (error1) {
                        console.error("Error creating channel:", error1);
                        res.status(500).json({ success: false, error: "Internal Server Error" });
                        return;
                    }
                    channel.assertQueue(
                        "",
                        {
                            exclusive: true, //* This means that the queue will be deleted once the connection is closed.
                            //*The client needs this queue for receiving the response from the server.

                            durable: false, //* it means that RabbitMQ will make sure that the queue and its messages are stored on disk
                            //* and will be available even if the RabbitMQ server restarts.
                        },
                        function (error2, q) {
                            if (error2) {
                                console.error("Error asserting queue:", error2);
                                res.status(500).json({
                                    success: false,
                                    error: "Internal Server Error",
                                });
                                return;
                            }
                            var correlationId = generateUuid();

                            console.log(q);

                            channel.consume(
                                q.queue,
                                function (msg) {
                                    if (msg.properties.correlationId == correlationId) {
                                        let toObj = JSON.parse(msg.content.toString()); // Convert buffer to string before parsing JSON
                                        if (toObj) {
                                            res.json({ success: true, data: toObj });
                                            rabbitConnection.close();
                                        }
                                    }
                                },
                                {
                                    noAck: true,
                                }
                            );

                            const urlBuffer = Buffer.from(JSON.stringify(req.body.given_url));

                            channel.sendToQueue("screenshot_queue", urlBuffer, {
                                correlationId: correlationId,
                                replyTo: q.queue,
                            });
                        }
                    );
                });
            } catch (err) {
                console.error("Error occurred:", err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
            }
        } else {
            res.status(400).json({ success: false, error: "Bad Request: given_url is missing" });
        }
    }
});

app.listen(port, () => {
    console.log("Server listening on port 8009");
});

function generateUuid() {
    return Math.random().toString() + Math.random().toString() + Math.random().toString();
}
