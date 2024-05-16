import amqp from "amqplib/callback_api.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

amqp.connect(
    `amqp://${process.env.RABBIT_USERNAME}:${process.env.PASSWORD}@${process.env.IP}:5672/`,
    function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }
            var queue = "screenshot_queue";

            channel.assertQueue(queue, {
                durable: false,
            });
            channel.prefetch(1);
            console.log(" [x] Awaiting RPC requests");
            channel.consume(
                queue,
                function reply(msg) {
                    let toObj = JSON.parse(msg.content);
                    (async () => {
                        try {
                            console.log("test 1");

                            const browser = await puppeteer.launch({
                                // executablePath: "../chromedriver-win64/chromedriver.exe",
                                // executablePath:
                                // "../chrome-headless-shell-win64/chrome-headless-shell.exe",
                                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                            });
                            let response = [];

                            // Open a new page
                            for (let i of toObj) {
                                const page = await browser.newPage();
                                await page.goto(i, {
                                    waitUntil: "networkidle0",
                                });
                                const currentDate = new Date();
                                const year = currentDate.getFullYear();
                                const month = ("0" + (currentDate.getMonth() + 1)).slice(-2); // Month starts from 0
                                const day = ("0" + currentDate.getDate()).slice(-2);

                                // Create directory structure if it doesn't exist
                                const directoryPath = `/home/test-tlg/domains/bot.test-tlg.ir/public_html/screen_images/${year}/${month}/${day}`;
                                if (!fs.existsSync(directoryPath)) {
                                    fs.mkdirSync(directoryPath, { recursive: true });
                                }

                                // Extract URL name for filename
                                const urlName = i
                                    .split("/")
                                    .filter((item) => item)
                                    .pop();
                                const screenshotPath = path.join(directoryPath, `${urlName}.png`);

                                let screenshot = await page.screenshot({
                                    type: "png",
                                    encoding: "base64",
                                    fullPage: true,
                                });

                                // Write screenshot to file
                                fs.writeFileSync(screenshotPath, screenshot, "base64");
                                response.push({
                                    url: i,
                                    screenshot_url:
                                        "https://bot.test-tlg.ir/screen_images/" +
                                        year +
                                        "/" +
                                        month +
                                        "/" +
                                        day +
                                        "/" +
                                        urlName +
                                        ".png",
                                });
                                page.close();
                            }

                            channel.sendToQueue(
                                msg.properties.replyTo,
                                Buffer.from(JSON.stringify(response)),
                                {
                                    correlationId: msg.properties.correlationId,
                                }
                            );
                        } catch (e) {
                            console.log(e);
                        } finally {
                            channel.ack(msg);
                        }
                    })();
                },
                {
                    noAck: false,
                }
            );
        });
    }
);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
